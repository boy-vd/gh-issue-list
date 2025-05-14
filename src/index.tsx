import { Router } from 'itty-router';

import { RequestUpdateIntegrationInstallation } from '@gitbook/api';
import {
    createIntegration,
    createComponent,
    createOAuthHandler,
    OAuthResponse,
    FetchEventCallback,
} from '@gitbook/runtime';

import { getGithubContent, GithubProps } from './github';
import { GithubRuntimeContext } from './types';
import { generateIssuesBlock } from './block-generator';

const embedBlock = createComponent<
    { url?: string },
    { visible: boolean },
    {
        action: 'show' | 'hide';
    },
    GithubRuntimeContext
>({
    componentId: 'github-issues-list',
    initialState: {
        visible: true,
    },

    async action(element, action) {
        switch (action.action) {
            case '@link.unfurl': {
                const { url } = action;

                return {
                    props: {
                        url,
                    },
                };
            }
            case 'show': {
                return { state: { visible: true } };
            }
            case 'hide': {
                return { state: { visible: false } };
            }
        }

        return element;
    },

    async render(element, context) {
        const { url } = element.props as GithubProps;
        const found = await getGithubContent(url, context);

        if (!found) {
            return (
                <block>
                    <card title="Not Found" />
                </block>
            );
        }

        const { content } = found;
        return generateIssuesBlock(content as any[], url);
    },
});

const handleFetchEvent: FetchEventCallback<GithubRuntimeContext> = async (request, context) => {
    const { environment } = context;

    const router = Router({
        base: new URL(
            environment.spaceInstallation?.urls?.publicEndpoint ||
                environment.installation?.urls.publicEndpoint ||
                environment.integration.urls.publicEndpoint,
        ).pathname,
    });

    /*
     * Authenticate the user using OAuth.
     */
    router.get(
        '/oauth',
        // @ts-ignore
        createOAuthHandler({
            redirectURL: `${context.environment.integration.urls.publicEndpoint}/oauth`,
            clientId: environment.secrets.CLIENT_ID,
            clientSecret: environment.secrets.CLIENT_SECRET,
            authorizeURL: 'https://github.com/login/oauth/authorize',
            accessTokenURL: 'https://github.com/login/oauth/access_token',
            scopes: ['repo'],
            prompt: 'consent',
            extractCredentials,
        }),
    );

    const response = await router.handle(request, context);
    if (!response) {
        return new Response(`No route matching ${request.method} ${request.url}`, {
            status: 404,
        });
    }

    return response;
};

const extractCredentials = async (
    response: OAuthResponse,
): Promise<RequestUpdateIntegrationInstallation> => {
    const { access_token } = response;

    return {
        configuration: {
            oauth_credentials: {
                access_token,
                expires_at: Date.now() + response.expires_in * 1000,
                refresh_token: response.refresh_token,
            },
        },
    };
};

export default createIntegration<GithubRuntimeContext>({
    fetch: handleFetchEvent,
    components: [embedBlock],
});
