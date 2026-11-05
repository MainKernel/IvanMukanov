import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { RolesGuard } from "../common/authz/roles.guard";
import { OrganizerController } from "./organizer.controller";
import { OrganizerService } from "./organizer.service";

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [OrganizerController],
  providers: [OrganizerService, RolesGuard],
})
export class OrganizerModule {}

