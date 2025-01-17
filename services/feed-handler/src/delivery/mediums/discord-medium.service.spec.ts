import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JobResponse } from "@synzen/discord-rest";
import { JobResponseError } from "@synzen/discord-rest/dist/RESTConsumer";
import {
  ArticleDeliveryErrorCode,
  ArticleDeliveryRejectedCode,
} from "../../shared";
import {
  ArticleDeliveryState,
  ArticleDeliveryStatus,
  DeliveryDetails,
} from "../types";
import { DiscordMediumService } from "./discord-medium.service";

jest.mock("@synzen/discord-rest", () => ({
  RESTProducer: jest.fn(),
}));

const clientId = "client-id";
const rabbitMqUri = "rabbit-mq-uri";
const producer = {
  fetch: jest.fn(),
};

const jobResponseToDeliveryStatusCases: Array<
  [JobResponse<unknown> | JobResponseError, Partial<ArticleDeliveryState>]
> = [
  [
    { state: "error", message: "some error message" },
    {
      status: ArticleDeliveryStatus.Failed,
      errorCode: ArticleDeliveryErrorCode.Internal,
      internalMessage: "some error message",
    },
  ],
  [
    { state: "success", status: 200, body: {} },
    {
      status: ArticleDeliveryStatus.Sent,
    },
  ],
  [
    {
      state: "success",
      status: 400,
      body: {},
    },
    {
      status: ArticleDeliveryStatus.Rejected,
      errorCode: ArticleDeliveryRejectedCode.BadRequest,
    },
  ],
  [
    {
      state: "success",
      status: 401,
      body: {},
    },
    {
      status: ArticleDeliveryStatus.Failed,
      errorCode: ArticleDeliveryErrorCode.Internal,
    },
  ],
];

describe("DiscordMediumService", () => {
  let service: DiscordMediumService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordMediumService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DiscordMediumService>(DiscordMediumService);
    service.clientId = clientId;
    service.rabbitMqUri = rabbitMqUri;
    service.producer = producer as never;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation();
  });

  describe("deliverArticle", () => {
    const article = {
      id: "1",
    };

    const deliveryDetails: DeliveryDetails = {
      mediumId: "medium-id",
      deliverySettings: {
        guildId: "guild-id",
        channel: { id: "channel-1" },
        webhook: {
          id: "webhook-id-1",
          token: "webhook-token-1",
        },
        content: "content",
      },
      feedDetails: {
        id: "feed-id",
        blockingComparisons: [],
        passingComparisons: [],
        url: "url",
      },
    };

    it("returns the status of the result", async () => {
      const producerFetchResponse: JobResponse<unknown> = {
        status: 200,
        body: {},
        state: "success",
      };
      producer.fetch.mockReturnValue(producerFetchResponse);
      const result = await service.deliverArticle(article, deliveryDetails);
      expect(result).toEqual({
        mediumId: deliveryDetails.mediumId,
        status: ArticleDeliveryStatus.Sent,
      });
    });

    it("returns failed status on error", async () => {
      const mockError = new Error("mock error");
      producer.fetch.mockRejectedValue(mockError);
      const result = await service.deliverArticle(article, deliveryDetails);

      expect(result).toEqual({
        mediumId: deliveryDetails.mediumId,
        status: ArticleDeliveryStatus.Failed,
        errorCode: ArticleDeliveryErrorCode.Internal,
        internalMessage: mockError.message,
      });
    });

    it("sends embeds", async () => {
      const detailsWithEmbeds: DeliveryDetails = {
        ...deliveryDetails,
        deliverySettings: {
          ...deliveryDetails.deliverySettings,
          embeds: [
            {
              author: {
                name: "author-name",
                iconUrl: "author-icon-url",
              },
              footer: {
                text: "footer-text",
                iconUrl: "footer-icon-url",
              },
              image: {
                url: "image-url",
              },
              thumbnail: {
                url: "thumbnail-url",
              },
              title: "title",
              description: "description",
              url: "url",
              color: 123,
              fields: [
                {
                  name: "name",
                  value: "value",
                  inline: true,
                },
              ],
            },
          ],
        },
      };

      await service.deliverArticle(article, detailsWithEmbeds);
      const callBody = JSON.parse(producer.fetch.mock.calls[0][1].body);
      expect(callBody).toMatchObject({
        embeds: [
          {
            author: {
              name: "author-name",
              icon_url: "author-icon-url",
            },
            footer: {
              text: "footer-text",
              icon_url: "footer-icon-url",
            },
            image: {
              url: "image-url",
            },
            thumbnail: {
              url: "thumbnail-url",
            },
            title: "title",
            description: "description",
            url: "url",
            color: 123,
            fields: [
              {
                name: "name",
                value: "value",
                inline: true,
              },
            ],
          },
        ],
      });
    });

    describe("channel", () => {
      it("should call the producer for the channel", async () => {
        await service.deliverArticle(article, {
          ...deliveryDetails,
          deliverySettings: {
            ...deliveryDetails.deliverySettings,
            webhook: null,
          },
        });

        expect(producer.fetch).toHaveBeenCalledWith(
          `${DiscordMediumService.BASE_API_URL}/channels/channel-1/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: "content",
            }),
          },
          {
            articleID: "1",
            feedURL: deliveryDetails.feedDetails.url,
            channel: "channel-1",
            feedId: deliveryDetails.feedDetails.id,
            guildId: deliveryDetails.deliverySettings.guildId,
          }
        );
      });

      it("sends messages with replaced template strings", async () => {
        const article = {
          id: "1",
          title: "some-title-here",
        };
        const details: DeliveryDetails = {
          ...deliveryDetails,
          deliverySettings: {
            ...deliveryDetails.deliverySettings,
            content: "content {{title}}",
            webhook: null,
          },
        };
        await service.deliverArticle(article, details);

        expect(producer.fetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: JSON.stringify({
              content: "content some-title-here",
            }),
          }),
          expect.anything()
        );
      });

      it.each(jobResponseToDeliveryStatusCases)(
        "returns the correct result for job response %o",
        (jobResponse, expectedDeliveryState) => {
          producer.fetch.mockReturnValue(jobResponse);

          return expect(
            service.deliverArticle(article, deliveryDetails)
          ).resolves.toEqual(expect.objectContaining(expectedDeliveryState));
        }
      );
    });

    describe("webhook", () => {
      it("prioritizes webhook over channel, calls the producer for the webhook", async () => {
        await service.deliverArticle(article, deliveryDetails);

        const webhook1Id = deliveryDetails.deliverySettings.webhook?.id;
        const webhook1Token = deliveryDetails.deliverySettings.webhook?.token;
        deliveryDetails.deliverySettings.webhook?.token;
        expect(producer.fetch).toHaveBeenCalledWith(
          `${DiscordMediumService.BASE_API_URL}/webhooks/${webhook1Id}/${webhook1Token}`,
          {
            method: "POST",
            body: JSON.stringify({
              content: "content",
            }),
          },
          {
            articleID: "1",
            feedURL: deliveryDetails.feedDetails.url,
            webhookId: webhook1Id,
            feedId: deliveryDetails.feedDetails.id,
            guildId: deliveryDetails.deliverySettings.guildId,
          }
        );
      });

      it("sends messages with replaced template strings", async () => {
        const article = {
          id: "1",
          title: "some-title-here",
        };
        const details: DeliveryDetails = {
          ...deliveryDetails,
          deliverySettings: {
            ...deliveryDetails.deliverySettings,
            content: "content {{title}}",
          },
        };
        await service.deliverArticle(article, details);

        expect(producer.fetch).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            body: JSON.stringify({
              content: "content some-title-here",
            }),
          }),
          expect.anything()
        );
      });

      it.each(jobResponseToDeliveryStatusCases)(
        "returns the correct result for job response %o",
        (jobResponse, expectedDeliveryState) => {
          producer.fetch.mockReturnValue(jobResponse);

          return expect(
            service.deliverArticle(article, deliveryDetails)
          ).resolves.toEqual(expect.objectContaining(expectedDeliveryState));
        }
      );
    });
  });
});
