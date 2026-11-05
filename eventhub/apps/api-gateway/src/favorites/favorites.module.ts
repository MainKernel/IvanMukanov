import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { FavoritesController } from "./favorites.controller";
import { FavoritesRepository } from "./favorites.repository";
import { FavoritesService } from "./favorites.service";

@Module({
  imports: [CatalogModule],
  controllers: [FavoritesController],
  providers: [FavoritesService, FavoritesRepository],
})
export class FavoritesModule {}
