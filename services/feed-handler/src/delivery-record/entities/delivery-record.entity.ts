import { Entity, Property, PrimaryKey, Enum } from "@mikro-orm/core";
import { ArticleDeliveryStatus } from "../../shared";

@Entity()
export class DeliveryRecord {
  @PrimaryKey()
  id: number;

  @Property()
  feed_id: string;

  @Property()
  created_at: Date = new Date();

  @Enum(() => ArticleDeliveryStatus)
  status: ArticleDeliveryStatus;

  @Property({
    nullable: true,
  })
  internal_message?: string;

  @Property({
    nullable: true,
  })
  error_code?: string;

  constructor(data: Omit<DeliveryRecord, "id" | "created_at">) {
    this.feed_id = data.feed_id;
    this.status = data.status;
    this.error_code = data.error_code;
    this.internal_message = data.internal_message;
  }
}
