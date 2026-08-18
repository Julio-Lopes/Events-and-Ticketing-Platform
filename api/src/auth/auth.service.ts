import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Este e-mail ja esta cadastrado.');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: Role.CUSTOMER,
      },
    });
    return this.sign(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    /**
     * Mensagem identica para e-mail inexistente e senha errada.
     * Diferenciar as duas entregaria de graca quais e-mails existem.
     */
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!ok) throw new UnauthorizedException('E-mail ou senha invalidos.');

    return this.sign(user.id, user.email, user.role, user.name);
  }

  private async sign(id: string, email: string, role: Role, name: string) {
    return {
      accessToken: await this.jwt.signAsync({ sub: id, email, role }),
      user: { id, name, email, role },
    };
  }
}
