import { Box, Text } from '@chakra-ui/react';
import { useDiscordUserMe } from '../../hooks';

export const DiscordUserDropdown: React.FC = () => {
  const {
    data: userMe,
  } = useDiscordUserMe();

  return (
    <Box overflow="hidden" width="100%" textAlign="left">
      <Text color="gray.500">Welcome</Text>
      <Text
        width="100%"
        textOverflow="ellipsis"
        overflow="hidden"
        fontSize="lg"
        whiteSpace="nowrap"
      >
        {userMe?.username}
      </Text>
    </Box>
  );
};
