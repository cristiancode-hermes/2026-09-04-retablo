import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Ticket, User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    private readonly jwt: JwtService,
  ) {}

  async derivedPoints(userId: string): Promise<number> {
    return this.tickets.count({ where: { userId, status: 'ended' } });
  }

  async register(dto: { username: string; email: string; password: string }) {
    const exists = await this.users.findOne({
      where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });
    if (exists) throw new ConflictException('Usuario o email ya registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.users.save({
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: 'customer',
      displayName: dto.username.trim(),
      createdAt: new Date(),
    } as any)) as User;
    return this.tokenResponse(user);
  }

  async login(dto: { identifier: string; password: string }) {
    const id = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({
      where: [{ email: id }, { username: id }],
    });
    if (!user) throw new UnauthorizedException('Usuario o contraseña no coinciden');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Usuario o contraseña no coinciden');
    return this.tokenResponse(user);
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const points = await this.derivedPoints(userId);
    return this.toAuthUser(user, points);
  }

  async patchProfile(userId: string, displayName?: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (typeof displayName === 'string') {
      user.displayName = displayName.trim() || user.displayName;
      await this.users.save(user);
    }
    const points = await this.derivedPoints(userId);
    return this.toAuthUser(user, points);
  }

  private async tokenResponse(user: User) {
    const points = await this.derivedPoints(user.id);
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.toAuthUser(user, points),
    };
  }

  toAuthUser(user: User, points: number) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      points,
    };
  }
}
