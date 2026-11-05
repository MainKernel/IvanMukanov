import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import type { Event, OrganizerEventList } from "@eventhub/contracts";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/authz/roles.decorator";
import { RolesGuard } from "../common/authz/roles.guard";
import {
  CreateEventBodyDto,
  OrganizerEventIdParamDto,
  UpdateEventBodyDto,
} from "./organizer.dto";
import { OrganizerService } from "./organizer.service";

@Controller("organizer/events")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class OrganizerController {
  constructor(private readonly organizer: OrganizerService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<OrganizerEventList> {
    return this.organizer.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateEventBodyDto,
  ): Promise<Event> {
    return this.organizer.create(user, body);
  }

  @Patch(":eventId")
  update(
    @CurrentUser() user: AuthUser,
    @Param() params: OrganizerEventIdParamDto,
    @Body() body: UpdateEventBodyDto,
  ): Promise<Event> {
    return this.organizer.update(user, params.eventId, body);
  }
}

