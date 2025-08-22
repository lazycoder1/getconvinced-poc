export type ScreenshotView = {
    name: string;
    title: string;
    filename: string;
    description: string;
};

export const SCREENSHOT_VIEWS: ScreenshotView[] = [
    {
        name: "calls",
        title: "CRM Calls",
        filename: "CRM-Calls.png",
        description:
            "The Calls dashboard in HubSpot CRM. Review and manage call logs, outcomes, and follow-ups. Helpful for sales activity tracking and coaching.",
    },
    {
        name: "companies",
        title: "Companies",
        filename: "CRM-Companies.png",
        description:
            "Companies index listing organizations in your CRM. View company health, owners, and segmented lists for prioritization.",
    },
    {
        name: "contacts_all",
        title: "Contacts – All Customers",
        filename: "CRM-Contacts-AllCustomers.png",
        description:
            "All Customers view for Contacts. Browse customer records with key fields such as lifecycle stage, owner, and recent activity.",
    },
    {
        name: "contacts_unsubscribed",
        title: "Contacts – Unsubscribed",
        filename: "CRM-Contacts-Unsubscribed.png",
        description:
            "Contacts who have unsubscribed from communications. Useful for compliance checks and audience cleanup workflows.",
    },
    {
        name: "contacts_newsletters",
        title: "Contacts – Newsletters",
        filename: "CRM-Contacts-newsletters.png",
        description:
            "Newsletter segment of Contacts. Targeted audience for updates and product announcements; monitor engagement and growth.",
    },
    {
        name: "contacts",
        title: "Contacts",
        filename: "CRM-Contacts.png",
        description:
            "Primary Contacts index. Central place to browse, filter, and drill into individual contact records and recent activities.",
    },
    {
        name: "deals",
        title: "Deals",
        filename: "CRM-Deals.png",
        description:
            "Deals pipeline board. Track opportunities across stages, owners, and amounts to forecast revenue and manage pipeline health.",
    },
    {
        name: "inbox",
        title: "Inbox",
        filename: "CRM-Inbox.png",
        description:
            "Shared team inbox showing conversations across channels. Triage, assign, and reply to ensure fast, coordinated responses.",
    },
    {
        name: "lists",
        title: "Lists",
        filename: "CRM-Lists.png",
        description:
            "Lists manager for building dynamic or static segments. Combine filters to target audiences for campaigns and workflows.",
    },
    {
        name: "my_companies",
        title: "My Companies",
        filename: "CRM-MyCompanies.png",
        description:
            "Personalized view of companies assigned to you. Focus on owned accounts to drive action and follow-up.",
    },
    {
        name: "tasks",
        title: "Tasks",
        filename: "CRM-Tasks.png",
        description:
            "Task queue for daily work. Review due and upcoming tasks across contacts, companies, and deals to keep momentum.",
    },
    {
        name: "tickets",
        title: "Tickets",
        filename: "CRM-Tickets.png",
        description:
            "Customer support tickets pipeline. Monitor status, owners, and SLAs to maintain service quality and responsiveness.",
    },
];

export const SCREENSHOT_VIEW_MAP: Record<string, ScreenshotView> = Object.fromEntries(
    SCREENSHOT_VIEWS.map((v) => [v.name, v])
);


