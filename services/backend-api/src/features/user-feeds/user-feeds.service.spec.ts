import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { FeedFetcherService } from "../../services/feed-fetcher/feed-fetcher.service";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from "../../utils/integration-tests";
import { MongooseTestModule } from "../../utils/mongoose-test.module";
import { DiscordAuthService } from "../discord-auth/discord-auth.service";
import { BannedFeedException } from "../feeds/exceptions";
import { FeedsService } from "../feeds/feeds.service";
import { UserFeed, UserFeedFeature, UserFeedModel } from "./entities";
import { UserFeedsService } from "./user-feeds.service";

describe("UserFeedsService", () => {
  let service: UserFeedsService;
  let userFeedModel: UserFeedModel;
  let feedFetcherService: FeedFetcherService;
  let discordAuthService: DiscordAuthService;
  let feedsService: FeedsService;

  beforeAll(async () => {
    const { uncompiledModule, init } = await setupIntegrationTests({
      providers: [
        FeedsService,
        FeedFetcherService,
        DiscordAuthService,
        UserFeedsService,
      ],
      imports: [
        MongooseTestModule.forRoot(),
        MongooseModule.forFeature([UserFeedFeature]),
      ],
    });

    uncompiledModule
      .overrideProvider(FeedFetcherService)
      .useValue({
        fetchFeed: jest.fn(),
      })
      .overrideProvider(DiscordAuthService)
      .useValue({
        getUser: jest.fn(),
      })
      .overrideProvider(FeedsService)
      .useValue({
        canUseChannel: jest.fn(),
        getBannedFeedDetails: jest.fn(),
      });

    const { module } = await init();

    service = module.get<UserFeedsService>(UserFeedsService);
    userFeedModel = module.get<UserFeedModel>(getModelToken(UserFeed.name));
    feedFetcherService = module.get<FeedFetcherService>(FeedFetcherService);
    discordAuthService = module.get<DiscordAuthService>(DiscordAuthService);
    feedsService = module.get<FeedsService>(FeedsService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(async () => {
    await userFeedModel?.deleteMany({});
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe("addFeed", () => {
    it("throws if feed is baned", async () => {
      jest
        .spyOn(feedsService, "getBannedFeedDetails")
        .mockResolvedValue({} as never);

      await expect(
        service.addFeed("123", {
          title: "title",
          url: "url",
        })
      ).rejects.toThrow(BannedFeedException);
    });

    it("throws if fetch feed throws", async () => {
      const err = new Error("fetch feed error");
      jest.spyOn(feedFetcherService, "fetchFeed").mockRejectedValue(err);

      await expect(
        service.addFeed("123", {
          title: "title",
          url: "url",
        })
      ).rejects.toThrow(err);
    });

    it("returns the created entity", async () => {
      jest
        .spyOn(feedFetcherService, "fetchFeed")
        .mockResolvedValue({} as never);

      const discordUser = {
        id: "123",
      };
      jest
        .spyOn(discordAuthService, "getUser")
        .mockResolvedValue(discordUser as never);

      const createDetails = {
        title: "title",
        url: "url",
      };
      const entity = await service.addFeed("123", createDetails);

      expect(entity).toMatchObject({
        title: "title",
        url: "url",
        user: {
          discordUserId: discordUser.id,
        },
      });
    });
  });

  describe("getFeedById", () => {
    it("returns the feed", async () => {
      const feed = await userFeedModel.create({
        title: "title",
        url: "url",
        user: {
          discordUserId: "123",
        },
      });

      const result = await service.getFeedById(feed.id);

      expect(result).toMatchObject({
        _id: feed._id,
        title: "title",
        url: "url",
        user: {
          discordUserId: "123",
        },
      });
    });

    it("returns null if feed does not exist", async () => {
      const result = await service.getFeedById(
        new Types.ObjectId().toHexString()
      );

      expect(result).toBeNull();
    });
  });

  describe("deleteFeeById", () => {
    it("deletes the feed", async () => {
      const feed = await userFeedModel.create({
        title: "title",
        url: "url",
        user: {
          discordUserId: "123",
        },
      });

      await service.deleteFeedById(feed.id);

      const result = await userFeedModel.findById(feed.id);

      expect(result).toBeNull();
    });
  });

  describe("getFeedsByUser", () => {
    it("returns the feeds", async () => {
      const user = {
        discordUserId: "123",
      };
      const [feed] = await userFeedModel.create([
        {
          title: "title",
          url: "url",
          user,
        },
        {
          title: "title",
          url: "url",
          user: {
            discordUserId: user.discordUserId + "-other",
          },
        },
      ]);

      const result = await service.getFeedsByUser({
        userId: user.discordUserId,
      });

      expect(result).toMatchObject([
        {
          _id: feed._id,
          title: feed.title,
          url: feed.url,
          user,
        },
      ]);
    });

    it("works with search on title", async () => {
      const user = {
        discordUserId: "123",
      };
      const [, , feed3] = await userFeedModel.create([
        {
          title: "title1",
          url: "url1",
          user,
        },
        {
          title: "title2 HERE",
          url: "url2",
          user: {
            discordUserId: user.discordUserId + "-other",
          },
        },
        {
          title: "title2 HERE",
          url: "url3",
          user,
        },
      ]);

      const result = await service.getFeedsByUser({
        userId: user.discordUserId,
        search: "2 here",
      });

      expect(result).toHaveLength(1);
      expect(result).toMatchObject([
        {
          _id: feed3._id,
          title: feed3.title,
          url: feed3.url,
          user,
        },
      ]);
    });

    it("works with search on url", async () => {
      const user = {
        discordUserId: "123",
      };
      const [, , feed2] = await userFeedModel.create([
        {
          title: "title1",
          url: "url",
          user,
        },
        {
          title: "title2",
          url: "url HERE",
          user: {
            discordUserId: user.discordUserId + "-other",
          },
        },
        {
          title: "title3",
          url: "url HERE",
          user,
        },
      ]);

      const result = await service.getFeedsByUser({
        userId: user.discordUserId,
        search: "here",
      });

      expect(result).toHaveLength(1);
      expect(result).toMatchObject([
        {
          _id: feed2._id,
          title: feed2.title,
          url: feed2.url,
          user,
        },
      ]);
    });
  });

  it("works with offset and limit", async () => {
    const user = {
      discordUserId: "123",
    };
    const [feed1Id, feed2Id, feed3Id, feed4Id] = [
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
    ];

    await userFeedModel.collection.insertMany([
      {
        _id: feed1Id,
        title: "title1",
        url: "url1",
        user,
        createdAt: new Date(2020),
      },
      {
        _id: feed2Id,
        title: "title2",
        url: "url2",
        user,
        createdAt: new Date(2021),
      },
      {
        _id: feed3Id,
        title: "title3",
        url: "url3",
        user,
        createdAt: new Date(2022),
      },
      {
        _id: feed4Id,
        title: "title4",
        url: "url4",
        user,
        createdAt: new Date(2023),
      },
    ]);

    const result = await service.getFeedsByUser({
      userId: user.discordUserId,
      offset: 1,
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result).toMatchObject([
      {
        _id: feed3Id,
        title: "title3",
        url: "url3",
        user,
      },
    ]);
  });

  it('returns feeds in descending order by "createdAt"', async () => {
    const user = {
      discordUserId: "123",
    };
    const [feed1Id, feed2Id, feed3Id] = [
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
      new Types.ObjectId(),
    ];

    await userFeedModel.collection.insertMany([
      {
        _id: feed1Id,
        title: "title1",
        url: "url1",
        user,
        createdAt: new Date(2020),
      },
      {
        _id: feed2Id,
        title: "title2",
        url: "url2",
        user,
        createdAt: new Date(2021),
      },
      {
        _id: feed3Id,
        title: "title3",
        url: "url3",
        user,
        createdAt: new Date(2022),
      },
    ]);

    const result = await service.getFeedsByUser({
      userId: user.discordUserId,
    });

    expect(result).toHaveLength(3);
    expect(result).toMatchObject([
      {
        _id: feed3Id,
        title: "title3",
        url: "url3",
        user,
      },
      {
        _id: feed2Id,
        title: "title2",
        url: "url2",
        user,
      },
      {
        _id: feed1Id,
        title: "title1",
        url: "url1",
        user,
      },
    ]);
  });
});