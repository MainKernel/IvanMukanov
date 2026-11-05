import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { idempotencyKey, type Order } from "@eventhub/contracts";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateOrderBodyDto, OrderIdParamDto } from "./orders.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  listMy(@CurrentUser() user: AuthUser): Promise<Order[]> {
    return this.orders.listMy(user);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateOrderBodyDto,
    @Headers("idempotency-key") rawKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Order> {
    const parsed = idempotencyKey.safeParse(rawKey);
    const key = parsed.success ? parsed.data : undefined;

    const { order, replayed } = await this.orders.create(user, body, key);
    res.status(replayed ? HttpStatus.OK : HttpStatus.CREATED);
    return order;
  }

  @Get(":orderId")
  getOne(
    @Param() params: OrderIdParamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Order> {
    return this.orders.getOne(params.orderId, user);
  }

  @Post(":orderId/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param() params: OrderIdParamDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Order> {
    return this.orders.cancel(params.orderId, user);
  }
}
