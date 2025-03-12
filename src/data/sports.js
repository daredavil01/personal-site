const { PUBLIC_URL } = process.env; // set automatically from package.json:homepage

const sportsData = [
  {
    id: 1,
    title: "NDA Marathon",
    date: "2021-02-21",
    place: "NDA, Pune",
    distance: "10K",
    time: "1:00:00",
    timeCertificateLink:
      "https://www.sportstimingsolutions.in/share.php?event_id=76805&bib=10214",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_1.heic`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_2.heic`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_3.heic`,
        caption: "Slide 3",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_4.heic`,
        caption: "Slide 4",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_5.heic`,
        caption: "Slide 5",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_6.heic`,
        caption: "Slide 6",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_7.heic`,
        caption: "Slide 7",
      },
      {
        url: `${PUBLIC_URL}/images/insta_posts/8_8.heic`,
        caption: "Slide 8",
      },
    ],
  },
];

export default sportsData;
