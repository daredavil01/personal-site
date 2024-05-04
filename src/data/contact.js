import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faLinkedinIn } from "@fortawesome/free-brands-svg-icons/faLinkedinIn";
import { faTwitter } from "@fortawesome/free-brands-svg-icons/faTwitter";
import { faEnvelope } from "@fortawesome/free-regular-svg-icons/faEnvelope";
import { faSnowflake } from "@fortawesome/free-regular-svg-icons/faSnowflake";
// See https://fontawesome.com/icons?d=gallery&s=brands,regular&m=free
// to add other icons.

// add code comment
// data is variable that stores list of dictionary with keys: link, label, icon.
// link is the url of the contact.
// label is the text that will be displayed in the contact.
// icon is the fontawesome icon that will be displayed in the contact.
// example: {link: "https://github.com/daredavil01", label: "Github", icon: faGithub}
const data = [
  {
    link: "https://linktr.ee/daredavil",
    label: "LinkTree",
    icon: faSnowflake,
  },
  {
    link: "https://github.com/daredavil01",
    label: "Github",
    icon: faGithub,
  },
  {
    link: "https://www.linkedin.com/in/sankettambare/",
    label: "LinkedIn",
    icon: faLinkedinIn,
  },
  {
    link: "https://twitter.com/i_daredavil",
    label: "Twitter",
    icon: faTwitter,
  },
  {
    link: "mailto:sanket.tambare01@gmail.com",
    label: "Email",
    icon: faEnvelope,
  },
];

export default data;
