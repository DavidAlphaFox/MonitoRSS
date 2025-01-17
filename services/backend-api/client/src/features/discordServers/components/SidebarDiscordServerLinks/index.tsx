import { Stack, Text } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import {
  FiRss, FiSettings,
} from 'react-icons/fi';
import { SidebarLink } from '../../../../components/SidebarLink';
import { DiscordServerSearchSelect } from '../DiscordServerSearchSelect';

interface Props {
  currentPath: string
  serverId: string
  onChangePath: (path: string) => void
}

export const SidebarDiscordServerLinks: React.FC<Props> = ({
  currentPath, serverId, onChangePath,
}) => {
  const { t } = useTranslation();

  const onClickNavLink = (path: string) => {
    onChangePath(path);
  };

  const paths = {
    SERVER_FEEDS: `/servers/${serverId}/feeds`,
    SERVER_SETTINGS: `/servers/${serverId}/settings`,
    SERVER_WEBHOOKS: `/servers/${serverId}/webhooks`,
  };

  return (
    <Stack spacing="2">
      <Text
        fontSize="xs"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="widest"
        color="gray.500"
      >
        {t('components.sidebar.server.manage')}
      </Text>
      <DiscordServerSearchSelect />
      <SidebarLink
        disabled={!serverId}
        icon={FiRss}
        active={currentPath === paths.SERVER_FEEDS}
        onClick={() => onClickNavLink(paths.SERVER_FEEDS)}
      >
        {t('components.sidebar.server.feeds')}
      </SidebarLink>
      <SidebarLink
        disabled={!serverId}
        icon={FiSettings}
        active={currentPath === paths.SERVER_SETTINGS}
        onClick={() => {
          onClickNavLink(paths.SERVER_SETTINGS);
        }}
      >
        {t('components.sidebar.server.settings')}
      </SidebarLink>
      {/* <SidebarLink
        icon={FiShare2}
        active={currentPath === paths.SERVER_WEBHOOKS}
        onClick={() => onClickNavLink(paths.SERVER_WEBHOOKS)}
      >
        {t('components.sidebar.server.webhooks')}
      </SidebarLink> */}
    </Stack>

  );
};
