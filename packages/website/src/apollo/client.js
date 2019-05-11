import { ApolloClient } from "apollo-client";
import { HttpLink } from "apollo-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";

import resolvers from "./resolvers";
import { typeDefs } from "./schema";

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: new HttpLink({
    uri: "https://api.thegraph.com/subgraphs/name/paulrberg/sablier",
  }),
  resolvers,
  typeDefs,
});

export default client;
