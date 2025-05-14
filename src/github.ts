import { ExposableError } from '@gitbook/runtime';
import { GithubInstallationConfiguration, GithubRuntimeContext } from './types';

export interface GithubProps {
    url: string;
}

export const splitGithubUrl = (url: string) => {
    const issuesRegex = /^https?:\/\/github\.com\/([\w-]+)\/([\w-]+)\/issues$/;

    let orgName = '';
    let repoName = '';

    if (url.match(issuesRegex)) {
        const match = url.match(issuesRegex);
        if (!match) {
            return;
        }

        orgName = match[1];
        repoName = match[2];
    }
    return {
        orgName,
        repoName,
    };
};

const getHeaders = (authorise: boolean, accessToken = '') => {
    const headers: { 'User-Agent': string; Authorization?: string } = {
        'User-Agent': 'request',
    };

    if (authorise) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
};

const getGithubApiResponse = async (
    headers: { 'User-Agent': string; Authorization?: string },
    baseURL: string,
) => {
    const res = await fetch(baseURL, { headers }).catch((err) => {
        throw new Error(`Error fetching content from ${baseURL}. ${err}`);
    });

    if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
            return false;
        } else {
            throw new Error(`Response status from ${baseURL}: ${res.status}`);
        }
    }

    return res.json();
};

const fetchGithubIssues = async (
    orgName: string,
    repoName: string,
    accessToken: string,
) => {
    const baseURL = `https://api.github.com/repos/${orgName}/${repoName}/issues`;
    const headers = getHeaders(accessToken !== '', accessToken);

    return await getGithubApiResponse(headers, baseURL);
};

export const getGithubContent = async (url: string, context: GithubRuntimeContext): Promise<{ content: any[] } | undefined> => {
    const urlObject = splitGithubUrl(url);
    if (!urlObject) {
        return undefined;
    }

    const configuration = context.environment.installation
        ?.configuration as GithubInstallationConfiguration;
    const accessToken = configuration.oauth_credentials?.access_token;
    if (!accessToken) {
        throw new ExposableError('Integration is not authenticated with GitHub');
    }

    const response = await fetchGithubIssues(
        urlObject.orgName,
        urlObject.repoName,
        accessToken,
    );

    if (!response) {
        return undefined;
    }

    return { content: response as any[] };
};