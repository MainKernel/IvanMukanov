import { updateUserRoleBody, userIdParam } from "@eventhub/contracts";
import { createZodDto } from "../common/validation/zod-dto";

export class UserIdParamDto extends createZodDto(userIdParam) {}
export class UpdateUserRoleBodyDto extends createZodDto(updateUserRoleBody) {}

