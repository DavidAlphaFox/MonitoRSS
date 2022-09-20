import { getRepositoryToken } from "@mikro-orm/nestjs";
import { EntityRepository } from "@mikro-orm/postgresql";
import {
  ArticleDeliveryErrorCode,
  ArticleDeliveryRejectedCode,
  ArticleDeliveryState,
  ArticleDeliveryStatus,
  clearDatabase,
  setupIntegrationTests,
  teardownIntegrationTests,
} from "../shared";
import { DeliveryRecordService } from "./delivery-record.service";
import { DeliveryRecord } from "./entities";

describe("DeliveryRecordService", () => {
  let service: DeliveryRecordService;
  let deliveryRecordRepo: EntityRepository<DeliveryRecord>;

  beforeAll(async () => {
    const { init } = await setupIntegrationTests(
      {
        providers: [DeliveryRecordService],
      },
      {
        models: [DeliveryRecord],
      }
    );

    const { module } = await init();

    service = module.get<DeliveryRecordService>(DeliveryRecordService);
    deliveryRecordRepo = module.get<EntityRepository<DeliveryRecord>>(
      getRepositoryToken(DeliveryRecord.name)
    );
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("store", () => {
    it("stores sent articles correctly", async () => {
      const feedId = "feed-id";
      const articleState: ArticleDeliveryState = {
        status: ArticleDeliveryStatus.Sent,
      };
      await service.store(feedId, articleState);

      const records = await deliveryRecordRepo.findAll();

      expect(records).toHaveLength(1);
      expect(records[0].feed_id).toBe(feedId);
      expect(records[0].status).toBe(ArticleDeliveryStatus.Sent);
    });

    it("stores failed articles correctly", async () => {
      const feedId = "feed-id";
      const articleState: ArticleDeliveryState = {
        status: ArticleDeliveryStatus.Failed,
        errorCode: ArticleDeliveryErrorCode.NoChannelOrWebhook,
        internalMessage: "internal-message",
      };
      await service.store(feedId, articleState);

      const records = await deliveryRecordRepo.findAll();

      expect(records).toHaveLength(1);
      expect(records[0].feed_id).toBe(feedId);
      expect(records[0].status).toBe(ArticleDeliveryStatus.Failed);
      expect(records[0].error_code).toBe(articleState.errorCode);
      expect(records[0].internal_message).toBe(articleState.internalMessage);
    });

    it("stores rejected articles correctly", async () => {
      const feedId = "feed-id";
      const articleState: ArticleDeliveryState = {
        status: ArticleDeliveryStatus.Rejected,
        errorCode: ArticleDeliveryRejectedCode.BadRequest,
        internalMessage: "internal-message",
      };
      await service.store(feedId, articleState);

      const records = await deliveryRecordRepo.findAll();

      expect(records).toHaveLength(1);
      expect(records[0].feed_id).toBe(feedId);
      expect(records[0].status).toBe(ArticleDeliveryStatus.Rejected);
      expect(records[0].error_code).toBe(articleState.errorCode);
      expect(records[0].internal_message).toBe(articleState.internalMessage);
    });

    it("stores other article states correctly correctly", async () => {
      const feedId = "feed-id";
      const articleState: ArticleDeliveryState = {
        status: ArticleDeliveryStatus.FilteredOut,
      };
      await service.store(feedId, articleState);

      const records = await deliveryRecordRepo.findAll();

      expect(records).toHaveLength(1);
      expect(records[0].feed_id).toBe(feedId);
      expect(records[0].status).toBe(ArticleDeliveryStatus.FilteredOut);
    });
  });
});