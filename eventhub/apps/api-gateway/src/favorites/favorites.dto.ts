import { favoriteEventIdParam } from "@eventhub/contracts";
import { createZodDto } from "../common/validation/zod-dto";

export class FavoriteEventIdParamDto extends createZodDto(favoriteEventIdParam) {}
