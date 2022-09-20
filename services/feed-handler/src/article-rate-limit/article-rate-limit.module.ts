import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { DeliveryRecordModule } from "../delivery-record/delivery-record.module";
import { ArticleRateLimitService } from "./article-rate-limit.service";
import { FeedArticleDeliveryLimit } from "./entities";

@Module({
  providers: [ArticleRateLimitService],
  imports: [
    DeliveryRecordModule,
    MikroOrmModule.forFeature([FeedArticleDeliveryLimit]),
  ],
})
export class ArticleRateLimitModule {}
