# Smoke test do fluxo completo.
# Uso: .\scripts\smoke.ps1   (com a API rodando e o seed aplicado)

$ErrorActionPreference = 'Stop'
$API = 'http://localhost:3001/api'
$ok = 0; $fail = 0

function Step($name, $block) {
  try {
    $result = & $block
    Write-Host "  OK   $name" -ForegroundColor Green
    $script:ok++
    return $result
  } catch {
    Write-Host "  FALHA $name" -ForegroundColor Red
    Write-Host "        $($_.Exception.Message)" -ForegroundColor DarkGray
    $script:fail++
    throw
  }
}

function Login($email) {
  $body = @{ email = $email; password = 'elite123' } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/auth/login" -Method Post -Body $body -ContentType 'application/json'
  return @{ Authorization = "Bearer $($r.accessToken)" }
}

Write-Host "`n== Autenticacao ==" -ForegroundColor Cyan
$organizador = Step 'login organizador' { Login 'organizador@elite.dev' }
$cliente     = Step 'login cliente1'    { Login 'cliente1@elite.dev' }
$portaria    = Step 'login portaria'    { Login 'portaria@elite.dev' }

Step 'papel errado e barrado (cliente em rota de portaria)' {
  try {
    Invoke-RestMethod -Uri "$API/gate/events" -Headers $cliente | Out-Null
    throw 'deveria ter sido barrado com 403'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
    'barrado corretamente'
  }
}

Write-Host "`n== Vitrine ==" -ForegroundColor Cyan
$eventos = Step 'listar eventos publicados' {
  $r = Invoke-RestMethod -Uri "$API/events"
  if ($r.total -lt 2) { throw "esperava 2+ eventos publicados, veio $($r.total)" }
  $r
}

$cinema = $eventos.items | Where-Object { $_.title -like '*Duna*' } | Select-Object -First 1
if (-not $cinema) { Write-Host 'Evento de cinema nao encontrado. Rodou o seed?' -ForegroundColor Red; exit 1 }

$disp = Step 'consultar mapa de assentos' {
  Invoke-RestMethod -Uri "$API/events/$($cinema.id)/availability"
}

$setor = $disp.sectors | Where-Object { $_.kind -eq 'SEATED' } | Select-Object -First 1
$livres = $setor.seats | Where-Object { $_.state -eq 'FREE' } | Select-Object -First 2
Write-Host "       setor '$($setor.name)': $($setor.available) livres" -ForegroundColor DarkGray

Write-Host "`n== Reserva ==" -ForegroundColor Cyan
$pedido = Step 'reservar 2 lugares' {
  $body = @{
    eventId = $cinema.id
    items = @(@{ sectorId = $setor.id; seatIds = @($livres[0].id, $livres[1].id) })
  } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Uri "$API/orders" -Method Post -Headers $cliente -Body $body -ContentType 'application/json'
}

Step 'o mesmo lugar nao pode ser reservado de novo' {
  $body = @{
    eventId = $cinema.id
    items = @(@{ sectorId = $setor.id; seatIds = @($livres[0].id) })
  } | ConvertTo-Json -Depth 5
  try {
    Invoke-RestMethod -Uri "$API/orders" -Method Post -Headers $cliente -Body $body -ContentType 'application/json' | Out-Null
    throw 'vendeu o mesmo lugar duas vezes'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    'conflito detectado'
  }
}

Write-Host "`n== Pagamento ==" -ForegroundColor Cyan
Step 'cartao de recusa e recusado' {
  $body = @{ cardNumber='4111111111110000'; holderName='RAFAEL SOUZA'; expiry='12/30'; cvv='123' } | ConvertTo-Json
  try {
    Invoke-RestMethod -Uri "$API/orders/$($pedido.id)/payment" -Method Post -Headers $cliente -Body $body -ContentType 'application/json' | Out-Null
    throw 'aprovou um cartao que deveria recusar'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 400) { throw }
    'recusado'
  }
}

Step 'a reserva sobrevive a recusa' {
  $o = Invoke-RestMethod -Uri "$API/orders/$($pedido.id)" -Headers $cliente
  if ($o.status -ne 'PENDING') { throw "esperava PENDING, veio $($o.status)" }
  'lugar mantido'
}

Step 'pagamento aprovado' {
  $body = @{ cardNumber='4111111111111111'; holderName='RAFAEL SOUZA'; expiry='12/30'; cvv='123' } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/orders/$($pedido.id)/payment" -Method Post -Headers $cliente -Body $body -ContentType 'application/json'
  if ($r.status -ne 'PAID') { throw "esperava PAID, veio $($r.status)" }
  $r
}

Write-Host "`n== Ingressos ==" -ForegroundColor Cyan
$ingressos = Step 'ingressos emitidos com QR' {
  $r = Invoke-RestMethod -Uri "$API/tickets/mine" -Headers $cliente
  if ($r.Count -lt 2) { throw "esperava 2 ingressos, veio $($r.Count)" }
  if (-not $r[0].qrPayload) { throw 'ingresso sem payload de QR' }
  $r
}
Write-Host "       codigo: $($ingressos[0].code)" -ForegroundColor DarkGray

Step 'link compartilhado abre sem login' {
  $token = ($ingressos[0].shareUrl -split '/')[-1]
  Invoke-RestMethod -Uri "$API/tickets/shared/$token"
}

Write-Host "`n== Portaria ==" -ForegroundColor Cyan
Step 'QR valido entra' {
  $body = @{ eventId = $cinema.id; payload = $ingressos[0].qrPayload } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/gate/validate" -Method Post -Headers $portaria -Body $body -ContentType 'application/json'
  if ($r.result -ne 'VALID') { throw "esperava VALID, veio $($r.result)" }
  'VALID'
}

Step 'o mesmo QR nao entra duas vezes' {
  $body = @{ eventId = $cinema.id; payload = $ingressos[0].qrPayload } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/gate/validate" -Method Post -Headers $portaria -Body $body -ContentType 'application/json'
  if ($r.result -ne 'ALREADY_USED') { throw "esperava ALREADY_USED, veio $($r.result)" }
  'ALREADY_USED'
}

Step 'codigo digitado a mao funciona' {
  $body = @{ eventId = $cinema.id; code = $ingressos[1].code } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/gate/validate" -Method Post -Headers $portaria -Body $body -ContentType 'application/json'
  if ($r.result -ne 'VALID') { throw "esperava VALID, veio $($r.result)" }
  'VALID'
}

Step 'assinatura adulterada e rejeitada' {
  $adulterado = $ingressos[0].qrPayload.Substring(0, $ingressos[0].qrPayload.Length - 4) + 'AAAA'
  $body = @{ eventId = $cinema.id; payload = $adulterado } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$API/gate/validate" -Method Post -Headers $portaria -Body $body -ContentType 'application/json'
  if ($r.result -ne 'INVALID') { throw "esperava INVALID, veio $($r.result)" }
  'INVALID'
}

$outro = $eventos.items | Where-Object { $_.id -ne $cinema.id } | Select-Object -First 1
if ($outro) {
  Step 'ingresso do evento errado e recusado' {
    $body = @{ eventId = $outro.id; code = $ingressos[1].code } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$API/gate/validate" -Method Post -Headers $portaria -Body $body -ContentType 'application/json'
    if ($r.result -ne 'WRONG_EVENT') { throw "esperava WRONG_EVENT, veio $($r.result)" }
    'WRONG_EVENT'
  }
}

Write-Host "`n$ok passaram, $fail falharam.`n" -ForegroundColor Cyan
Write-Host "Para repetir, rode 'npx prisma db seed' antes: os lugares deste teste ficam vendidos.`n" -ForegroundColor DarkGray