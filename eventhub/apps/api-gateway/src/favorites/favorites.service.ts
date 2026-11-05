import { Injectable } from "@nestjs/common";
import type { FavoriteList } from "@eventhub/contracts";
import { CatalogService } from "../catalog/catalog.service";
import { env } from "../common/config/env";
import { FavoritesUnavailable } from "../common/problem/domain-errors";
import { FavoritesRepository } from "./favorites.repository";

/** Штучна затримка, щоб оптимістичне оновлення й відкат було видно оком. */
const LATENCY_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class FavoritesService {
  constructor(
    private readonly repo: FavoritesRepository,
    private readonly catalog: CatalogService,
  ) {}

  list(): FavoriteList {
    return { eventIds: this.repo.list() };
  }

  async add(eventId: string): Promise<void> {
    await sleep(LATENCY_MS);
    this.failIfConfigured();
    // 404 для неіснуючої події — той самий EventNotFound, що й у каталозі.
    await this.catalog.getOne(eventId);
    this.repo.add(eventId);
  }

  async remove(eventId: string): Promise<void> {
    await sleep(LATENCY_MS);
    this.failIfConfigured();
    this.repo.remove(eventId);
  }

  /** FAVORITES_FAIL=true — перевірка відкату оптимістичного оновлення. */
  private failIfConfigured(): void {
    if (env.FAVORITES_FAIL) throw new FavoritesUnavailable();
  }
}
