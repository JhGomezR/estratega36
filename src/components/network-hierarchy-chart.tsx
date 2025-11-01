"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role } from '@/lib/types';

interface ChartData {
    name: string;
    value: number;
    avatar: string;
    roleName: string;
    voterCount: number;
    childrenCount: number;
    children?: ChartData[];
}

const buildChartData = (users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const root: ChartData = {
        name: "EstrategaCRM",
        value: 0,
        avatar: "",
        roleName: "Root",
        voterCount: 0,
        childrenCount: 0,
        children: [],
    };

    if (!users || users.length === 0) {
        return root;
    }

    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    // First pass: create all user nodes
    users.forEach(user => {
        const voterCount = voters.filter(v => v.promoterId === user.id).length;
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            value: 1, // Base value for visibility
            avatar: user.avatar,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            voterCount,
            childrenCount: 0, // This will be updated in the second pass
            children: [],
        });
    });
    
    const topLevelNodes: ChartData[] = [];

    // Second pass: build the hierarchy and update children counts
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            if (parentNode) {
                parentNode.children?.push(userNode);
                parentNode.childrenCount = parentNode.children?.length || 0;
            }
        } else {
            if (user.email !== 'axdrcys@gmail.com') {
                 topLevelNodes.push(userNode);
            }
        }
    });

    root.children = topLevelNodes;
    root.childrenCount = topLevelNodes.length;
    
    // Function to recursively sum up values from children
    const calculateValue = (node: ChartData): number => {
        if (!node.children || node.children.length === 0) {
            return node.voterCount > 0 ? node.voterCount : 1;
        }
        let sum = 1; // Count the node itself
        node.children.forEach(child => {
            sum += calculateValue(child);
        });
        node.value = sum;
        return sum;
    };
    
    calculateValue(root);

    return root;
};


interface NetworkHierarchyChartProps {
    users: User[];
    voters: Voter[];
    roles: Role[];
}

export const NetworkHierarchyChart = ({ users, voters, roles }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(users, voters, roles), [users, voters, roles]);

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        const responsive = am5.Responsive.new(root);
        root.setThemes([ am5themes_Animated.new(root), responsive.newTheme() ]);

        let series = root.container.children.push(
            am5hierarchy.Tree.new(root, {
                downDepth: 1,
                initialDepth: 5,
                topDown: true,
                orientation: "vertical",
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                nodePaddingOuter: 30,
                nodePaddingInner: 10,
            })
        );
        
        series.nodes.template.setAll({
          draggable: false,
          toggleKey: "none"
        });

        series.nodes.template.set("tooltipText", "{name}");

        // Use HTML content for sophisticated layouts
        series.nodes.template.setup = (target) => {
            target.set("forceHidden", true);
            
            target.events.on("dataitemchanged", function(ev) {
                const dataItem = ev.target.dataItem;
                if (!dataItem) return;

                const data = dataItem.dataContext as ChartData;

                if (data.name === 'EstrategaCRM') {
                     target.set("forceHidden", true); // Hide root node visualization but keep it for layout
                } else {
                     target.set("forceHidden", false);
                }

                // Node container
                const container = am5.Container.new(root, {
                    width: am5.p100,
                    height: am5.p100,
                    layout: root.horizontalLayout,
                    x: -125, // Center the 250px card
                    y: -40,  // Center the 80px card
                });
                target.children.push(container);
                
                // HTML element for the card
                const htmlContainer = am5.HTML.new(root, {
                    html: `
                        <div style="
                            width: 250px; 
                            height: 80px; 
                            background-color: hsl(var(--card)); 
                            border: 1px solid hsl(var(--border)); 
                            border-radius: var(--radius);
                            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
                            display: flex;
                            align-items: center;
                            padding: 12px;
                            font-family: Inter, sans-serif;
                            color: hsl(var(--foreground));
                        ">
                            <img src="${data.avatar}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" data-ai-hint="person portrait" />
                            <div style="margin-left: 12px; flex-grow: 1;">
                                <div style="font-weight: 600; font-size: 14px; line-height: 1.2; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.name}</div>
                                <div style="font-size: 11px; background-color: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); border-radius: 9999px; padding: 2px 8px; display: inline-block; margin-top: 4px; text-transform: capitalize;">${data.roleName}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-size: 12px; color: hsl(var(--muted-foreground));">
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    <span style="font-weight: 500; color: hsl(var(--foreground));">${data.voterCount}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    <span style="font-weight: 500; color: hsl(var(--foreground));">${data.childrenCount}</span>
                                </div>
                            </div>
                        </div>
                    `
                });

                container.children.push(htmlContainer);
            });
        };
        
        series.links.template.set("strokeWidth", 2);

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data, users, voters, roles]);

    if (data.children?.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
