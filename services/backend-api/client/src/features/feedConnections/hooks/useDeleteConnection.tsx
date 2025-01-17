import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FeedConnectionType } from '../../../types';
import ApiAdapterError from '../../../utils/ApiAdapterError';
import { deleteDiscordChannelConnection, deleteDiscordWebhookConnection } from '../api';

interface DeleteConnectionInput {
  feedId: string;
  connectionId: string;
}

const methodsByType: Record<FeedConnectionType, (input: DeleteConnectionInput) => Promise<void>> = {
  [FeedConnectionType.DiscordWebhook]: deleteDiscordWebhookConnection,
  [FeedConnectionType.DiscordChannel]: deleteDiscordChannelConnection,
};

export const useDeleteConnection = (type: FeedConnectionType) => {
  const queryClient = useQueryClient();
  const {
    mutateAsync,
    status,
  } = useMutation<
  void,
  ApiAdapterError,
  DeleteConnectionInput
  >(
    (details) => {
      const method = methodsByType[type];

      return method(details);
    },
    {
      onSuccess: (data, inputData) => queryClient.invalidateQueries({
        queryKey: ['user-feed', {
          feedId: inputData.feedId,
        }],
        refetchType: 'all',
      }),
    },
  );

  return {
    mutateAsync,
    status,
  };
};
