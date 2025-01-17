import { InferType, object } from 'yup';
import { FeedSchema } from '../../../types/Feed';
import fetchRest from '../../../utils/fetchRest';

export interface GetFeedInput {
  feedId: string
}

const GetFeedOutputSchema = object({
  result: FeedSchema,
}).required();

export type GetFeedOutput = InferType<typeof GetFeedOutputSchema>;

export const getFeed = async (options: GetFeedInput): Promise<GetFeedOutput> => {
  const res = await fetchRest(
    `/api/v1/feeds/${options.feedId}`,
    {
      validateSchema: GetFeedOutputSchema,
    },
  );

  return res as GetFeedOutput;
};
