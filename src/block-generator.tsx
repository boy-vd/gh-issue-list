import { splitGithubUrl } from './github';

export const generateIssuesBlock = (issues: any[], url: string) => {
    const { orgName, repoName } = splitGithubUrl(url) || { orgName: '', repoName: '' };
    const openIssues = issues
        .filter(issue => !issue.pull_request)
        .map(({ number, title }) => ({ 
            number, 
            title,
            url: `https://github.com/${orgName}/${repoName}/issues/${number}`
        }));

    return (
        <block>
            <card title={`Open Issues for ${orgName}/${repoName}`}>
                {openIssues.map(issue => (
                    <hstack>
                        <box>
                            <markdown content={`[**#${issue.number}**](${issue.url})`} />
                        </box>
                        <box grow={1}>
                            <markdown content={issue.title} />
                        </box>
                    </hstack>
                ))}
            </card>
        </block>
    );
};