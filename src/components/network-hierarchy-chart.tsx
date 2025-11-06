"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role, Campaign } from '@/lib/types';
import { useTheme } from 'next-themes';


interface ChartData {
    name: string;
    id: string;
    roleName?: string;
    avatar?: string;
    children?: ChartData[];
    value: number;
    teamCount?: number;
    isVoter?: boolean;
    isCampaign?: boolean;
}


const buildChartData = (campaign: Campaign, users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            avatar: user.avatar,
            children: [],
            value: 0,
        });
    });

    const campaignVoters = voters.filter(voter => userMap.has(voter.promoterId));

    campaignVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        if (promoterNode) {
            if (!promoterNode.children) {
                promoterNode.children = [];
            }
            promoterNode.children.push({
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                value: 1,
                isVoter: true,
            });
        }
    });

    const topLevelNodes: ChartData[] = [];
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
             if (parentNode) {
                if (!parentNode.children) {
                    parentNode.children = [];
                }
                parentNode.children.push(userNode);
            }
        } else {
            topLevelNodes.push(userNode);
        }
    });

    const calculateValueAndCounts = (node: ChartData): number => {
        if (node.isVoter) {
            node.value = 1;
            return 1;
        }
        if (!node.children || node.children.length === 0) {
            node.value = 0;
            node.teamCount = 0;
            return 0;
        }
        
        const directUsers = node.children.filter(c => !c.isVoter);
        const directVoters = node.children.filter(c => c.isVoter);

        const childrenValue = node.children.reduce((acc, child) => acc + calculateValueAndCounts(child), 0);
        
        node.value = directVoters.length;
        node.teamCount = directUsers.length;
        
        return childrenValue + directVoters.length;
    };
    
    const campaignNode: ChartData = {
        name: campaign.name,
        roleName: campaign.campaignType,
        id: campaign.id,
        isCampaign: true,
        children: topLevelNodes,
        value: 0,
    };
    
    calculateValueAndCounts(campaignNode);

    return campaignNode;
};


interface NetworkHierarchyChartProps {
    campaign: Campaign;
    users: User[];
    voters: Voter[];
    roles: Role[];
}

const userIconSvg = "M-4.5,9.5A3.5,3.5 0 0,1 -1,6A3.5,3.5 0 0,1 2.5,9.5A3.5,3.5 0 0,1 -1,13A3.5,3.5 0 0,1 -4.5,9.5M-1,0A10,10 0 0,0 -11,10A10,10 0 0,0 -1,20A10,10 0 0,0 9,10A10,10 0 0,0 -1,0Z";

export const NetworkHierarchyChart = ({ campaign, users, voters, roles }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(campaign, users, voters, roles), [campaign, users, voters, roles]);
    const { theme } = useTheme();

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        root.setThemes([am5themes_Animated.new(root)]);

        let series = root.container.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                orientation: "vertical",
                topDown: true,
                downDepth: 1,
                initialDepth: 5,
                singleBranchOnly: false,
            })
        );
        
        series.nodes.template.setAll({
            toggleKey: "active",
            cursorOverStyle: "pointer",
            templateField: "nodeSettings"
        });
        
        series.links.template.set("strokeWidth", 1);
        
        series.nodes.template.setup = function(target) {
            // Hide default circle
            target.events.on("dataitemchanged", function(ev) {
                const circle = target.children.getIndex(0);
                if (circle) circle.set("forceHidden", true);
            });
            
            // Container for custom node layout
            const nodeContainer = target.children.push(
                am5.Container.new(root, {
                    width: am5.percent(100),
                    height: am5.percent(100),
                    layout: root.horizontalLayout,
                    centerX: am5.p50,
                    centerY: am5.p50,
                })
            );

            // Main rectangle
            const mainRect = am5.Rectangle.new(root, {
                width: 200,
                height: 70,
                fill: am5.color(theme === "dark" ? 0x2d3748 : 0xffffff),
                stroke: am5.color(theme === "dark" ? 0x4a5568 : 0xe2e8f0),
                strokeWidth: 1,
                cornerRadiusTL: 10,
                cornerRadiusTR: 10,
                cornerRadiusBL: 10,
                cornerRadiusBR: 10,
                shadowColor: am5.color(0x000000),
                shadowBlur: 5,
                shadowOpacity: 0.1,
                shadowOffsetX: 0,
                shadowOffsetY: 2,
            });

            // Add avatar picture
            const avatar = am5.Picture.new(root, {
                width: 50,
                height: 50,
                mask: am5.Circle.new(root, { radius: 25 }),
                x: 10,
                centerY: am5.p50,
            });

            // Text container
            const textContainer = am5.Container.new(root, {
                layout: root.verticalLayout,
                verticalScrollbar: am5.Scrollbar.new(root, { orientation: "vertical" }),
                paddingLeft: 15,
                centerY: am5.p50
            });

            const nameLabel = am5.Label.new(root, {
                text: "{name}",
                fontWeight: "600",
                fontSize: 14,
                fill: am5.color(theme === 'dark' ? 0xffffff : 0x000000),
            });

            const roleBadgeContainer = am5.Container.new(root, {
                layout: root.horizontalLayout,
                paddingTop: 4,
            });
            const roleBadgeRect = am5.Rectangle.new(root, {
                fill: am5.color(0x6b7280),
                cornerRadiusTL: 10,
                cornerRadiusTR: 10,
                cornerRadiusBL: 10,
                cornerRadiusBR: 10,
            });
            const roleLabel = am5.Label.new(root, {
                text: "{roleName}",
                fontSize: 10,
                fill: am5.color(0xffffff),
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 3,
                paddingBottom: 3,
            });
            roleBadgeContainer.children.push(roleBadgeRect, roleLabel);
            textContainer.children.push(nameLabel, roleBadgeContainer);
            
            // Counts container
            const countsContainer = am5.Container.new(root, {
                layout: root.verticalLayout,
                verticalScrollbar: am5.Scrollbar.new(root, { orientation: "vertical" }),
                paddingLeft: 10,
                centerY: am5.p50,
            });
            
            const teamCountContainer = am5.Container.new(root, { layout: root.horizontalLayout });
            const teamIcon = am5.Graphics.new(root, {
                svgPath: userIconSvg,
                fill: am5.color(0x6b7280),
            });
            const teamCountLabel = am5.Label.new(root, {
                text: "{teamCount}",
                fontSize: 12,
                paddingLeft: 5,
                fill: am5.color(theme === 'dark' ? 0xffffff : 0x000000),
            });
            teamCountContainer.children.push(teamIcon, teamCountLabel);

            const voterCountContainer = am5.Container.new(root, { layout: root.horizontalLayout });
            const voterIcon = am5.Graphics.new(root, {
                 svgPath: userIconSvg,
                 fill: am5.color(0x6b7280),
            });
            const voterCountLabel = am5.Label.new(root, {
                text: "{value}",
                fontSize: 12,
                paddingLeft: 5,
                fill: am5.color(theme === 'dark' ? 0xffffff : 0x000000),
            });
            voterCountContainer.children.push(voterIcon, voterCountLabel);
            countsContainer.children.push(teamCountContainer, voterCountContainer);


            // Add all elements to the main container
            nodeContainer.children.push(avatar, textContainer, countsContainer);
            
             target.events.on("dataitemchanged", function(ev) {
                const dataContext = ev.target.dataItem?.dataContext as ChartData;
                if (!dataContext) return;
                
                target.children.unshift(mainRect);

                if (dataContext.isVoter) {
                     mainRect.set("forceHidden", true);
                     nodeContainer.set("forceHidden", true);
                     const circle = target.children.getIndex(0);
                     if (circle) {
                        circle.setAll({ forceHidden: false, radius: 15, fill: am5.color(0x9CA3AF) });
                        target.children.push(am5.Graphics.new(root, { svgPath: userIconSvg, fill: am5.color(0xffffff), scale: 0.8, centerX: am5.p50, centerY: am5.p50 }))
                     }
                } else if (dataContext.isCampaign) {
                     avatar.set("forceHidden", true);
                     countsContainer.set("forceHidden", true);
                     mainRect.setAll({ height: 60, width: 160 });
                     textContainer.set("x", am5.p50);
                     textContainer.set("centerX", am5.p50);
                } else {
                    avatar.set("src", dataContext.avatar);
                    if (dataContext.teamCount === 0) teamCountContainer.set("forceHidden", true);
                    if (dataContext.value === 0) voterCountContainer.set("forceHidden", true);
                }
            });
        };

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data, theme]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
