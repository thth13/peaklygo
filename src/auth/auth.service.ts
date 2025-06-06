import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Cryptr = require('cryptr');
import { Model } from 'mongoose';
import { Request } from 'express';
import { JwtPayload, sign } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { getClientIp } from 'request-ip';
import { User } from 'src/user/interfaces/user.interface';
import { RefreshToken } from './interfaces/refresh-token.interface';
import { v4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { GoogleCodeResponse } from 'src/types';

@Injectable()
export class AuthService {
  cryptr: Cryptr;
  googleClient: OAuth2Client;

  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('RefreshToken')
    private readonly refreshTokenModel: Model<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {
    this.cryptr = new Cryptr(process.env.ENCRYPT_JWT_SECRET);
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
  }

  async googleAuth(codeResponse: GoogleCodeResponse) {
    try {
      const { tokens } = await this.googleClient.getToken({
        code: codeResponse.code,
        redirect_uri: 'postmessage',
      });

      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      return ticket.getPayload();
    } catch (err) {
      console.log(err.response.data);
      throw err;
    }
  }

  async createAccessToken(userId) {
    const accessToken = sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: 3600000,
    });

    return this.encryptText(accessToken);
  }

  async createRefreshToken(req: Request, userId) {
    const refreshToken = new this.refreshTokenModel({
      userId,
      refreshToken: v4(),
      ip: this.getIp(req),
      browser: this.getBrowserInfo(req),
      country: this.getCountry(req),
    });

    await refreshToken.save();
    return refreshToken.refreshToken;
  }

  async findRefreshToken(token: string) {
    const refreshToken = await this.refreshTokenModel.findOne({
      refreshToken: token,
    });

    if (!refreshToken) {
      throw new UnauthorizedException('User has been logged out.');
    }

    return refreshToken.userId;
  }

  async validateUser(jwtPayload: JwtPayload): Promise<User> {
    const user = await this.userModel.findOne({ _id: jwtPayload.userId });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return user;
  }

  private jwtExtractor(req: Request) {
    let token = null;
    if (req.header('x-token')) {
      token = req.get('x-token');
    } else if (req.headers.authorization) {
      token = req.headers.authorization.replace('Bearer ', '').replace(' ', '');
    } else if (req.body.token) {
      token = req.body.token.replace(' ', '');
    }
    if (req.query.token) {
      token = req.body.token.replace(' ', '');
    }

    const cryptr = new Cryptr(process.env.ENCRYPT_JWT_SECRET);
    if (token) {
      try {
        token = cryptr.decrypt(token);
      } catch (err) {
        throw new BadRequestException('Bad request.');
      }
    }
    return token;
  }

  // ***********************
  // ╔╦╗╔═╗╔╦╗╦ ╦╔═╗╔╦╗╔═╗
  // ║║║║╣  ║ ╠═╣║ ║ ║║╚═╗
  // ╩ ╩╚═╝ ╩ ╩ ╩╚═╝═╩╝╚═╝
  // ***********************
  returnJwtExtractor() {
    return this.jwtExtractor;
  }

  getIp(req: Request): string {
    return getClientIp(req);
  }

  getBrowserInfo(req: Request): string {
    return req.header['user-agent'] || 'XX';
  }

  getCountry(req: Request): string {
    return req.header['cf-ipcountry'] ? req.header['cf-ipcountry'] : 'XX';
  }

  encryptText(text: string): string {
    return this.cryptr.encrypt(text);
  }
}
