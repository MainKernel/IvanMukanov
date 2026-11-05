import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersRepository } from "./orders.repository";
import { ExpiredHoldsSweeper } from "./expired-holds.sweeper";

@Module({
  imports: [CatalogModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, ExpiredHoldsSweeper],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
