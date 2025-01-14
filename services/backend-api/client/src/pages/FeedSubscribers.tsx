import {
  Box,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Heading,
  Stack,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { DashboardContent } from '@/components';
import RouteParams from '../types/RouteParams';
import { useDiscordServerRoles } from '@/features/discordServers';
import { useFeedSubscribers } from '@/features/feed';
import { ErrorAlert } from '@/components/ErrorAlert';
import { AddSubscriberControls } from '@/features/feed/components/AddSubscriberControls';
import { FeedSubscribersTable } from '@/features/feed/components/FeedSubscribersTable';
import { SubscriberSidebar } from '@/features/feed/components/SubscriberSidebar';

const FeedSubscribers: React.FC = () => {
  const { serverId, feedId } = useParams<RouteParams>();
  const {
    data: rolesData,
    error: rolesError,
    status: rolesStatus,
  } = useDiscordServerRoles({ serverId });
  const {
    data: feedSubscribersData,
    status: feedSubscribersStatus,
    error: feedSubscribersError,
  } = useFeedSubscribers({ feedId });
  const { t } = useTranslation();
  const [selectedSubscriberId, setSelectedSubscriberId] = useState('');
  const sidebarEnabled = useBreakpointValue<boolean>({ base: true, '2xl': false });

  const allFeedSubscribeDiscordIds = useMemo(
    () => new Set(feedSubscribersData?.results
      ?.map((subscriber) => subscriber.discordId) || []),
    [feedSubscribersData],
  );

  const addableRoles = useMemo(
    () => rolesData?.results
      ?.filter((role) => !allFeedSubscribeDiscordIds.has(role.id)) || [],
    [rolesData, allFeedSubscribeDiscordIds],
  );

  useEffect(() => {
    setSelectedSubscriberId('');
  }, [serverId, feedId]);

  if (rolesError || feedSubscribersError) {
    return (
      <ErrorAlert
        description={rolesError?.message
      || feedSubscribersError?.message}
      />
    );
  }

  return (
    <Flex height="100%">
      <DashboardContent
        loading={feedSubscribersStatus === 'loading'}
        error={rolesError}
      >
        <Stack spacing="9">
          <Stack spacing="4">
            <Heading size="lg">{t('pages.subscribers.title')}</Heading>
            <AddSubscriberControls
              roles={addableRoles}
              feedId={feedId as string}
              loading={rolesStatus === 'loading'}
            />
          </Stack>
          <Stack spacing="4" overflow="auto">
            <FeedSubscribersTable
              serverId={serverId}
              feedId={feedId}
              onSelectedSubscriber={setSelectedSubscriberId}
              onDeletedSubscriber={() => setSelectedSubscriberId('')}
              selectedSubscriberId={selectedSubscriberId}
            />
          </Stack>
        </Stack>
      </DashboardContent>
      {selectedSubscriberId && !sidebarEnabled && (
      <Box
        display={{ base: 'none', '2xl': 'block' }}
        borderLeftWidth="1px"
        marginLeft="0"
        marginInlineStart="0 !important"
        height="100%"
        minWidth={{ base: 'none', '2xl': 'xl' }}
        width={{ base: 'none', '2xl': 'xl' }}
      >
        <SubscriberSidebar
          subscriberId={selectedSubscriberId}
          feedId={feedId}
          serverId={serverId}
        />
      </Box>
      )}
      {sidebarEnabled && (
      <Drawer
        autoFocus={false}
        size="lg"
        isOpen={!!selectedSubscriberId}
        onClose={() => {
          setSelectedSubscriberId('');
        }}
        placement="right"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <SubscriberSidebar
            subscriberId={selectedSubscriberId}
            feedId={feedId}
            serverId={serverId}
          />
        </DrawerContent>
      </Drawer>
      )}
    </Flex>
  );
};

export default FeedSubscribers;
