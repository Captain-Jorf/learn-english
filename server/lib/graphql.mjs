import { readFileSync } from 'node:fs';
import { graphql, buildSchema } from 'graphql';
import { AppError } from './http.mjs';

export function createGraphqlExecutor(services, schemaPath) {
  const schema = buildSchema(readFileSync(schemaPath, 'utf8'));

  const requireUser = (context) => {
    if (!context.user) throw new AppError(401, 'UNAUTHENTICATED', 'A valid user session is required.');
    return context.user;
  };

  const rootValue = {
    me: async (_args, context) => {
      const user = requireUser(context);
      return services.publicUser(user);
    },
    dashboard: async (_args, context) => services.getDashboard(requireUser(context).id),
    catalog: async (args) => services.getCatalog(args),
    learningPaths: async () => services.listPaths(),
    nextReview: async (_args, context) => services.getNextReview(requireUser(context).id),
    coachConversations: async (_args, context) => services.listConversations(requireUser(context).id),
    gradeReview: async ({ input }, context) => services.gradeReview(requireUser(context).id, input.wordId, input.outcome),
  };

  return async function execute(payload, contextValue) {
    const source = String(payload?.query || '');
    if (!source || source.length > 20_000) throw new AppError(400, 'INVALID_GRAPHQL_QUERY', 'A GraphQL query of up to 20,000 characters is required.');
    if (source.includes('__schema') || source.includes('__type')) {
      throw new AppError(403, 'INTROSPECTION_DISABLED', 'Schema introspection is disabled on the mobile API.');
    }

    const result = await graphql({
      schema,
      source,
      rootValue,
      contextValue,
      variableValues: payload.variables || {},
      operationName: payload.operationName,
    });
    return result;
  };
}
