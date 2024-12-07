import { ApolloServer, gql } from "apollo-server-micro";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../../models/User";
import { connectToDatabase } from "../../lib/mongodb";
import { NextApiRequest, NextApiResponse } from "next";

const SECRET_KEY = process.env.SECRET_KEY ?? "SECRET_KEY";

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): String
  }
`;

const resolvers = {
  Query: {
    me: async (_: any, __: any, { user }: { user: IUser | null }) => {
      if (!user) throw new Error("Not authenticated.");
      return { id: user.id, email: user.email };
    },
  },
  Mutation: {
    login: async (
      _: any,
      { email, password }: { email: string; password: string }
    ) => {
      console.log("login called");
      await connectToDatabase();
      const user = await User.findOne({ email });

      if (!user) throw new Error("User not found.");
      if (user.lockUntil && user.lockUntil > new Date()) {
        throw new Error("Account locked. Try again later.");
      }

      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 5 * 60 * 1000); // Lock for 5 minutes
          user.loginAttempts = 0;
        }
        await user.save();
        throw new Error("Invalid email or password.");
      }

      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
        expiresIn: "1h",
      });

      return token;
    },
  },
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }: { req: NextApiRequest }) => {
    const token = req.headers.authorization ?? "";
    if (token) {
      try {
        const decoded = jwt.verify(token, SECRET_KEY) as IUser;
        return { user: decoded };
      } catch {
        throw new Error("Session expired. Please log in again.");
      }
    }
    return { user: null };
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apolloServer.createHandler({ path: "/api/graphql" });
