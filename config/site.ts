export type SiteConfig = typeof siteConfig;

export const siteConfig = {
    name: "Shadow - 英语学习平台",
    description: "通过精心收集的英语句子，让你的英语学习更高效、更有趣。智能分类、语音朗读、个性化管理，助你快速提升英语水平。",
    navItems: [
        {
            label: "句子",
            href: "/sentence",
        },
        {
            label: "统计",
            href: "/dashboard",
        },
    ],
    navMenuItems: [
        {
            label: "句子",
            href: "/sentence",
        },
        {
            label: "统计",
            href: "/dashboard",
        },
        {
            label: "设置",
            href: "/settings",
        },
    ],
    links: {
        github: "https://github.com/heroui-inc/heroui",
        twitter: "https://twitter.com/hero_ui",
        docs: "https://heroui.com",
        discord: "https://discord.gg/9b6yyZKmH4",
        sponsor: "https://patreon.com/jrgarciadev",
    },
};
