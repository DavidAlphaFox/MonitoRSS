import { useMutation, useQueryClient } from '@tanstack/react-query';
import ApiAdapterError from '@/utils/ApiAdapterError';
import {
  cloneFeed,
  CloneFeedInput, CloneFeedOutput, GetFeedOutput,
} from '../api';

export const useCloneFeed = () => {
  const queryClient = useQueryClient();
  const {
    mutateAsync,
    status,
    error,
  } = useMutation<CloneFeedOutput, ApiAdapterError, CloneFeedInput>(
    (details) => cloneFeed(details),
    {
      onSuccess: (data) => {
        const { results } = data;

        results.forEach((result) => {
          queryClient.setQueryData<GetFeedOutput>(['feed', {
            feedId: result.id,
          }], {
            result,
          });
        });
      },
    },
  );

  return {
    mutateAsync,
    status,
    error,
  };
};
