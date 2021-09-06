import jwt from "jsonwebtoken";
import { InvalidParameterError, UserNotFoundError } from "../errors";
import { Logger } from "../log";
import { Services } from "../services";
import { Token } from "../services/tokens";
import { MFAOption, UserAttribute } from "../services/userPoolClient";

interface Input {
  AccessToken: string;
}

interface Output {
  Username: string;
  UserAttributes: readonly UserAttribute[];
  MFAOptions?: readonly MFAOption[];
}

export type GetUserTarget = (body: Input) => Promise<Output | null>;

export const GetUser = (
  { cognitoClient }: Pick<Services, "cognitoClient">,
  logger: Logger
): GetUserTarget => async (body) => {
  const decodedToken = jwt.decode(body.AccessToken) as Token | null;
  if (!decodedToken) {
    logger.info("Unable to decode token");
    throw new InvalidParameterError();
  }

  const { sub, client_id, username } = decodedToken;
  if (!sub || !client_id) {
    return null;
  }

  const userPool = await cognitoClient.getUserPoolForClientId(client_id);
  const user = await userPool.getUserByUsername(username);
  if (!user) {
    throw new UserNotFoundError(username);
  }

  const output: Output = {
    Username: user.Username,
    UserAttributes: user.Attributes,
  };

  if (user.MFAOptions) {
    output.MFAOptions = user.MFAOptions;
  }

  return output;
};
