import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderRepository } from "./order.repository";

@Module({
  imports: [CatalogModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
