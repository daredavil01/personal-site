import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faLinkedinIn } from "@fortawesome/free-brands-svg-icons/faLinkedinIn";
import { faTwitter } from "@fortawesome/free-brands-svg-icons/faTwitter";
import { faWordpress } from "@fortawesome/free-brands-svg-icons/faWordpress";
import { faNewspaper } from "@fortawesome/free-regular-svg-icons/faNewspaper";
import { faAddressCard } from "@fortawesome/free-regular-svg-icons/faAddressCard";
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
    // No bg= param: the card reads the visitor's own theme, and pinning it to
    // dark would fight the site in light mode.
    link: "https://card.sankettambare.in/",
    label: "Digital Card",
    icon: faAddressCard,
  },
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
    // Font Awesome 6.3 predates the Substack brand icon (added in 6.6), so this
    // borrows the newspaper glyph rather than pulling in a newer FA.
    link: "https://sankettambare.substack.com",
    label: "Substack",
    icon: faNewspaper,
  },
  {
    link: "https://daredavil453624413.wordpress.com",
    label: "WordPress",
    icon: faWordpress,
  },
  {
    link: "mailto:sanket.tambare01@gmail.com",
    label: "Email",
    icon: faEnvelope,
  },
];

export default data;
