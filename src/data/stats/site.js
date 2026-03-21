import dayjs from "dayjs";

/* Keys match keys returned by the github api. Fields without keys are
 * mostly jokes. To see everything returned by the github api, run:
 curl https://api.github.com/repos/daredavil01/personal-site
 */

const data = [
  {
    label: "Stars this repository has on github",
    key: "stargazers_count",
    link: "https://github.com/daredavil01/personal-site/stargazers",
  },
  {
    label: "Commits till date",
    key: "commits",
    link: "https://github.com/daredavil01/personal-site/commits",
  },
  {
    label: "Last updated at",
    key: "pushed_at",
    link: "https://github.com/daredavil01/personal-site/commits",
    format: (x) => dayjs(x).format("MMMM DD, YYYY"),
  },
];

export default data;
