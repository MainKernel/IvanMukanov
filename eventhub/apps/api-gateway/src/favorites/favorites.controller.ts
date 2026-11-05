import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";
import type { FavoriteList } from "@eventhub/contracts";
import { FavoritesService } from "./favorites.service";
import { FavoriteEventIdParamDto } from "./favorites.dto";

@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(): FavoriteList {
    return this.favorites.list();
  }

  @Put(":eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  add(@Param() params: FavoriteEventIdParamDto): Promise<void> {
    return this.favorites.add(params.eventId);
  }

  @Delete(":eventId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: FavoriteEventIdParamDto): Promise<void> {
    return this.favorites.remove(params.eventId);
  }
}
