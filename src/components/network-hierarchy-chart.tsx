
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role, Campaign } from '@/lib/types';

interface ChartData {
    name: string;
    id: string;
    roleName?: string;
    children?: ChartData[];
    value: number;
    isVoter?: boolean;
    isCampaign?: boolean;
    isRole?: boolean;
}

const ADMIN_ROLE_NAMES = ['admin', 'super_admin', 'super', 'administrador'];

// Helper function to generate a consistent color from a string
function generateColorFromString(str: string): am5.Color {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return am5.color(parseInt("0x" + "00000".substring(0, 6 - color.length) + color, 16));
}


const buildChartData = (campaign: Campaign, allUsers: User[], allVoters: Voter[], allRoles: Role[]): ChartData => {
    // 1. Filter for active users in the current campaign and active voters
    const activeUsersInCampaign = allUsers.filter(u => u.status === 'activo' && u.campaignIds.includes(campaign.id));
    const activeVoters = allVoters.filter(v => v.status === 'activo');
    
    // Create a map of all valid roles (non-admin)
    const roleMap = new Map<string, ChartData>();
    allRoles
        .filter(role => role.status === 'activo' && !role.trash && !ADMIN_ROLE_NAMES.includes(role.name.toLowerCase()))
        .forEach(role => {
            roleMap.set(role.id, {
                id: role.id,
                name: role.name,
                roleName: 'Rol',
                isRole: true,
                children: [],
                value: 0
            });
        });

    // Create user nodes and group them under their roles in the roleMap
    const userMap = new Map<string, ChartData>();
    activeUsersInCampaign.forEach(user => {
        const userNode: ChartData = {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            roleName: allRoles.find(r => r.id === user.roleId)?.name || 'Sin Rol',
            children: [],
            value: 0
        };
        userMap.set(user.id, userNode);

        const roleNode = roleMap.get(user.roleId);
        if (roleNode) {
            roleNode.children?.push(userNode);
        }
    });

    // Attach voters to their respective promoters (users)
    activeVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        if (promoterNode?.children) {
            const voterNode: ChartData = {
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                value: 1, // Voters are the base value unit
                roleName: "Votante",
                isVoter: true
            };
            promoterNode.children.push(voterNode);
        }
    });

    // Function to calculate cumulative values (voter counts) upwards from voters
    const calculateValues = (node: ChartData): number => {
        if (node.isVoter) {
            return 1;
        }
        if (!node.children || node.children.length === 0) {
            node.value = 0;
            return 0;
        }
        const totalValue = node.children.reduce((sum, child) => sum + calculateValues(child), 0);
        node.value = totalValue;
        return totalValue;
    };
    
    // Calculate values for all roles
    roleMap.forEach(calculateValues);

    // Filter out roles that have no users in this campaign
    const campaignRoles = Array.from(roleMap.values()).filter(role => role.children && role.children.length > 0);

    // Create the root campaign node
    const campaignNode: ChartData = {
        name: campaign.name,
        roleName: campaign.campaignType,
        id: campaign.id,
        isCampaign: true,
        children: campaignRoles,
        value: 0 // Will be calculated last
    };
    
    // Final calculation for the root node
    calculateValues(campaignNode);

    return campaignNode;
};


interface NetworkHierarchyChartProps {
    campaign: Campaign;
    users: User[];
    voters: Voter[];
    roles: Role[];
}

export const NetworkHierarchyChart = ({ campaign, users, voters, roles }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(campaign, users, voters, roles), [campaign, users, voters, roles]);

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        root.setThemes([am5themes_Animated.new(root)]);

        let zoomableContainer = root.container.children.push(
          am5.ZoomableContainer.new(root, {
            width: am5.p100,
            height: am5.p100,
            wheelable: true,
            pinchZoom: true
          })
        );
        
        zoomableContainer.children.push(am5.ZoomTools.new(root, {
            target: zoomableContainer
        }));

        let series = zoomableContainer.contents.children.push(am5hierarchy.Tree.new(root, {
            valueField: "value",
            categoryField: "name",
            childDataField: "children",
            orientation: "vertical",
            downDepth: 1,
            initialDepth: 10,
            singleBranchOnly: false,
        }));
        
        series.nodes.template.setAll({
            toggleKey: "active",
            tooltipText: "{name}\n{roleName}\nVotantes: {value}",
            cursor: "pointer"
        });
        
        series.nodes.template.states.create("active", {
            // properties for the active state
        });

        series.circles.template.adapters.add("fill", function(fill, target) {
            const dataContext = target.dataItem?.dataContext as Partial<ChartData>;
            if (dataContext?.isCampaign) return am5.color(0x1A237E);
            if (dataContext?.isRole) return generateColorFromString(dataContext.name || "role");
            if (dataContext?.isVoter) return am5.color(0xFFC107);
            
            // Dynamically generate color for user nodes based on their role name
            const roleName = dataContext?.roleName || '';
            if (roleName) {
                return generateColorFromString(roleName);
            }
            
            return am5.color(0x9E9E9E); // Fallback color
        });

        
        series.circles.template.setAll({
          radius: 20,
        });

        series.labels.template.setAll({
            fontSize: 10,
            text: "{name}",
            oversizedBehavior: "wrap",
            textAlign: "center",
            width: 70
        });
        
        series.links.template.setAll({
            strokeWidth: 2,
        });

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
