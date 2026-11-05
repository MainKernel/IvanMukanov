import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import type { ZodIssue } from "zod";
import { hasZodSchema } from "./zod-dto";
import { RequestValidationFailed } from "../problem/domain-errors";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const dto = metadata.metatype;
    if (!hasZodSchema(dto)) return value;

    const result = dto.zodSchema.safeParse(value);
    if (result.success) return result.data;

    throw new RequestValidationFailed(
      result.error.issues.map((i: ZodIssue) => ({
        field: i.path.join(".") || "(корінь)",
        code: i.code,
        message: i.message,
      })),
    );
  }
}
