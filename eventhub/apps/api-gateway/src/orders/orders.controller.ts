import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Order } from "@eventhub/contracts";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OrdersService } from "./orders.service";
import {
  CancelOrderQueryDto,
  CreateOrderBodyDto,
  OrderIdParamDto,
} from "./orders.dto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateOrderBodyDto): Promise<Order> {
    return this.orders.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":orderId")
  getOne(
    @Param() params: OrderIdParamDto,
    @CurrentUser() current: AuthUser,
  ): Promise<Order> {
    return this.orders.getOne(params.orderId, current.id);
  }

  @Delete(":orderId")
  cancel(
    @Param() params: OrderIdParamDto,
    @Query() query: CancelOrderQueryDto,
  ): Promise<Order> {
    return this.orders.cancel(params.orderId, query.buyerId);
  }
}
