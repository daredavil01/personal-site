const { PUBLIC_URL } = process.env; // set automatically from package.json:homepage

const sportsData = [
  {
    id: 1,
    title: "NDA Marathon 2023",
    date: "October 15, 2023",
    description: "My first 10 Kms marathon :-)",
    place: "NDA, Pune",
    distance: "10K",
    time: "01:26:40",
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
  {
    id: 2,
    title: "Pune City Marathon 2024",
    date: "March 3, 2024",
    description: "First Half Marathon :-)",
    place: "Pune",
    distance: "21K",
    time: "02:45:52",
    timeCertificateLink:
      "https://sportstimingsolutions.in/results?q=eyJlX25hbWUiOiJQdW5lIENpdHkgTWFyYXRob24gMjAyNCIsImVfaWQiOjc4OTQ2LCJiaWJObyI6IjIyMjMxIn0%3D",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/apala_pune_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/apala_pune_2.jpg`,
        caption: "Slide 2",
      },
    ],
  },
  {
    id: 3,
    title: "AMIBOLT 2024",
    date: "March 17, 2024",
    description: "Another 10Kms Run :-)",
    place: "Pune",
    distance: "10K",
    time: "01:14:56",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/9c0290dc-eb15-4402-afb6-c2acd19b4291/?bibno=1210",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/amibolt_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/amibolt_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/amibolt_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 4,
    title: "ANP Run 2024",
    date: "April 7, 2024",
    description: "Was exhausted in last km, but finished :-)",
    place: "Pune",
    distance: "21K",
    time: "02:42:47",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/e3f74300-9e4e-4bfe-9449-ad82a2fd15e6/?bibno=21065",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/anp_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/anp_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/anp_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 5,
    title: "Vrukshathon 2024",
    date: "June 9, 2024",
    description: "Finished HM in one go :-)",
    place: "Pune",
    distance: "21K",
    time: "02:25:19",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/511e002f-fd82-494c-8335-69818d8834f5/?bibno=2392",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 6,
    title: "NMDC Hyderabad Marathon 2024",
    date: "August 26, 2024",
    description: "First HM outside Pune :-)",
    place: "Hyderabad",
    distance: "21K",
    time: "02:37:59",
    timeCertificateLink:
      "https://www.timingindia.com/my-result-details/MjU3Njg6dGltaW5nX3IyNDA4X05NRENITTJfTUFSQVRIT046Tk1EQyBIWURFUkFCQUQgTUFSQVRIT04gMjAyNA==#head",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 7,
    title: "Satara Half Hill Marathon 2024",
    description: "First HM with hills :-)",
    date: "September 01, 2024",
    place: "Satara",
    distance: "21K",
    time: "02:43:09",
    timeCertificateLink:
      "https://timekeeper.co.in/web/result/resultview?bibno=25026&event=43",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/shhm_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2.png`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 8,
    title: "Apala Pune Marathon 2024",
    date: "October 20, 2024",
    description: "Another HM with Personal Record :-)",
    place: "Pune",
    distance: "21K",
    time: "02:12:19",
    timeCertificateLink:
      "https://sportstimingsolutions.in/results?q=eyJlX25hbWUiOiJQdW5pdCBCYWxhbiBHcm91cCBBcGxhIFB1bmUgTWFyYXRob24gU2Vhc29uIDQiLCJlX2lkIjo4MzAxNSwiYmliTm8iOiIyMjEzNiJ9",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/apala_1.jpeg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/apala_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/apala_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 9,
    title: "CME Marathon 2024",
    date: "November 17, 2024",
    description: "Another HM record, almost broken :-)",
    place: "CME, Pune",
    distance: "21K",
    time: "2:11:47",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/2129f948-8913-4af0-a66f-09f418915355/?bibno=21632",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/cme_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/cme_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/cme_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 10,
    title: "Tata Mumbai Marathon 2025",
    date: "January 19, 2025",
    description: "First HM in Mumbai :-)",
    place: "Mumbai",
    distance: "42 Kms",
    time: "05:30:34",
    timeCertificateLink:
      "https://sportstimingsolutions.in/results?q=eyJlX25hbWUiOiJUYXRhIE11bWJhaSBNYXJhdGhvbiAyMDI1IiwiZV9pZCI6ODQyOTYsImJpYk5vIjoiOTEyNSJ9",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/tmm_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/tmm_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/tmm_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 11,
    title: "Milit Lake View HM 2025",
    date: "February 02, 2025",
    description: "Another HM in MILIT Campus in Pune :-)",
    place: "MILIT, Pune",
    distance: "21 Kms",
    time: "2:17:13",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/438d01d0-eaa0-4e18-b854-371dce7c8b72/?bibno=2119",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/milit_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/milit_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/milit_3.jpg`,
        caption: "Slide 3",
      },
    ],
  },
  {
    id: 12,
    title: "Tata Ultra Marathon, Lonavala 2025",
    date: "February 23, 2025",
    description: "First Ultra Marathon :-)",
    place: "Lonavala",
    distance: "35 Kms",
    time: "04:54:39",
    timeCertificateLink:
      "https://sportstimingsolutions.in/results?q=eyJlX25hbWUiOiJUYXRhIFVsdHJhIE1hcmF0aG9uIDIwMjUiLCJlX2lkIjo4NTA4MCwiYmliTm8iOiIzNjA1NiJ9",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/ultra_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/ultra_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/ultra_3.jpg`,
        caption: "Slide 3",
      },
      {
        url: `${PUBLIC_URL}/images/sports/ultra_4.jpg`,
        caption: "Slide 4",
      },
    ],
  },
  {
    id: 13,
    title: "Vrukshathon 2025",
    date: "June 1, 2025",
    description: "Broke my best timing for Half Marathon to 2 hrs 6 mins!",
    place: "Pune",
    distance: "21 Kms",
    time: "2:08:11",
    timeCertificateLink:
      "https://alpharacingsolution.com/event/bibres/68787d12-f9b2-4ae6-9509-d2f998f3d9d2/?bibno=21093",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_2025_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_2025_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/vrukshathon_2025_3.jpg`,
        caption: "Slide 3",
      }
    ],
  },
  {
    id: 14,
    title: "Satara Half Hill Marathon 2025",
    date: "September 14, 2025",
    description: "My second SHHM attempt, finished the tough route in 2 Hrs & 7 Mins",
    place: "Satara",
    distance: "21 Kms",
    time: "2:06:55",
    timeCertificateLink: "https://sportstimingsolutions.in/results?q=eyJlX25hbWUiOiJKQkcgU2F0YXJhIEhpbGwgSGFsZiBNYXJhdGhvbiAyMDI1IiwiZV9pZCI6ODgyNzYsImJpYk5vIjoiMjYwMDcifQ%3D%3D",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_3.jpg`,
        caption: "Slide 3",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_4.jpg`,
        caption: "Slide 4",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_5.jpg`,
        caption: "Slide 5",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_6.png`,
        caption: "Slide 6",
      },
      {
        url: `${PUBLIC_URL}/images/sports/shhm_2025_1.jpg`,
        caption: "Slide 1",
      },
    ],
  },
  {
    id: 15,
    title: "NMDC Hyderabad Marathon 2025",
    date: "August 24, 2025",
    description: "My first sub-2 half-marathon, finished in 1:59:57!",
    place: "Hyderabad",
    distance: "21 Kms",
    time: "1:59:57",
    timeCertificateLink:
      "https://ifinish.in/myresultdetail/H2YWFfmyN5Fzn9ie0HQ6vrSWBdVZotTiKxAOcGKM80YwhLNy2NFZpZMBqq5OPErhczPWIvvWvxyUGDhForMcPA",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_2025_1.jpg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_2025_2.jpg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/nmdc_2025_3.jpg`,
        caption: "Slide 3",
      }
    ],
  },
  {
    id: 16,
    title: "Pune International Marathon 2025",
    date: "December 7, 2025",
    description: "My first Half Marathon as a pacer, target 2.15 Hrs!",
    place: "Pune",
    distance: "21 Kms",
    time: "02:13:48",
    timeCertificateLink: "https://www.racetecresults.com/myresults.aspx?CId=19898&RId=3340&EId=3&AId=610661",
    slideImages: [
      {
        url: `${PUBLIC_URL}/images/sports/pim_1.jpeg`,
        caption: "Slide 1",
      },
      {
        url: `${PUBLIC_URL}/images/sports/pim_2.jpeg`,
        caption: "Slide 2",
      },
      {
        url: `${PUBLIC_URL}/images/sports/pim_3.jpeg`,
        caption: "Slide 3",
      },
      {
        url: `${PUBLIC_URL}/images/sports/pim_4.jpeg`,
        caption: "Slide 4",
      },
      {
        url: `${PUBLIC_URL}/images/sports/pim_5.jpeg`,
        caption: "Slide 5",
      },
    ],
  }
];

export default sportsData;
