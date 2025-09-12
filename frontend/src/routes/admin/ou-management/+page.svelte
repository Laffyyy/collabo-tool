<script lang="ts">
  import { Building2, Plus, Search, Edit, Trash2, Users, MapPin, FileText, MessageCircle, Radio, Shield, User, UserCheck, Send, ChevronRight, ChevronDown, X } from 'lucide-svelte';
  import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
  import { onMount } from 'svelte';
  import { createOU as createOUAPI, transformOUDataForAPI, getActiveOUs, getInactiveOUs, deactivateOUs as deactivateOUsAPI, deactivateOU as deactivateOUAPI, reactivateOU as reactivateOUAPI, reactivateOUs as reactivateOUsAPI, updateOU as updateOUAPI } from '$lib/api/OUmanagement';

  // TypeScript interfaces
  interface OrganizationUnit {
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    memberCount: number;
    location: string;
    createdAt: Date;
    modifiedAt: Date;
    status: 'active' | 'inactive';
    rules: OURules;
    _originalJsSettings?: any; // Store original jsSettings for tab determination
  }

  interface OURules {
    chat: {
      frontlineCanInitiate1v1: boolean;
      frontlineCanCreateGroups: boolean;
      frontlineCanJoinGroups: boolean;
      frontlineCanShareFiles: boolean;
      frontlineCanForwardMessages: boolean;
      supportCanInitiate1v1: boolean;
      supportCanCreateGroups: boolean;
      supportCanJoinGroups: boolean;
      supportCanShareFiles: boolean;
      supportCanForwardMessages: boolean;
      supervisorCanCreateGroups: boolean;
      supervisorCanShareFiles: boolean;
      supervisorCanForwardMessages: boolean;
      managerCanAccessAllGroups: boolean;
      managerCanShareFiles: boolean;
      managerCanForwardMessages: boolean;
      allowFileSharing: boolean;
      allowEmojis: boolean;
      messageRetentionDays: number;
      maxFileSize: number;
      allowedFileTypes: boolean;
      maxGroupSize: number;
      messageEditWindow: number;
      pinnedMessages: {
        enabled: boolean;
        maxPinnedPerConversation: number;
      };
    };
    broadcast: {
      frontlineCanCreateBroadcast: boolean;
      frontlineCanReplyToBroadcast: boolean;
      supportCanCreateBroadcast: boolean;
      supportCanReplyToBroadcast: boolean;
      supervisorCanCreateBroadcast: boolean;
      managerCanCreateBroadcast: boolean;
      requireApprovalForBroadcast: boolean;
      allowScheduledBroadcasts: boolean;
      allowPriorityBroadcasts: boolean;
      broadcastRetentionDays: number;
      requireAcknowledgment: boolean;
      acknowledgmentReminders: boolean;
      reminderInterval: number;
      maxBroadcastTargets: number;
    };
  }

  // Data state
  let organizationUnits = $state<OrganizationUnit[]>([]);
  let activeList = $state<OrganizationUnit[]>([]);
  let inactiveList = $state<OrganizationUnit[]>([]);

  let searchQuery = $state<string>('');
  let currentTab = $state<string>('active');
  let selectedOU = $state<OrganizationUnit | null>(null);
  let expandedNodes = $state<Set<string>>(new Set());
  let showCreateModal = $state<boolean>(false);
  let showEditModal = $state<boolean>(false);
  let showParentDetailsModal = $state<boolean>(false);
  let showConfirmationModal = $state<boolean>(false);
  let activeRulesTab = $state<'chat' | 'broadcast'>('chat');
  let confirmationAction = $state<string>('');
  let editOU = $state<Partial<OrganizationUnit> & { rules: OURules } | null>(null);
  let actionConfirm = $state<{
    message: string;
    confirmText: string;
    action: () => void;
  } | null>(null);

  // API state management
  let isCreatingOU = $state<boolean>(false);
  let apiError = $state<string>('');
  let apiSuccess = $state<string>('');
  let isLoading = $state<boolean>(false);
  let loadError = $state<string>('');
  let parentOUForNewChild = $state<OrganizationUnit | null>(null);

  const defaultRules: OURules = {
    chat: {
      frontlineCanInitiate1v1: true,
      frontlineCanCreateGroups: false,
      frontlineCanJoinGroups: true,
      frontlineCanShareFiles: false,
      frontlineCanForwardMessages: false,
      supportCanInitiate1v1: true,
      supportCanCreateGroups: false,
      supportCanJoinGroups: true,
      supportCanShareFiles: true,
      supportCanForwardMessages: true,
      supervisorCanCreateGroups: true,
      supervisorCanShareFiles: true,
      supervisorCanForwardMessages: true,
      managerCanAccessAllGroups: true,
      managerCanShareFiles: true,
      managerCanForwardMessages: true,
      allowFileSharing: true,
      allowEmojis: true,
      messageRetentionDays: 365,
      maxFileSize: 10,
      allowedFileTypes: false,
      maxGroupSize: 50,
      messageEditWindow: 15,
      pinnedMessages: { enabled: true, maxPinnedPerConversation: 10 }
    },
    broadcast: {
      frontlineCanCreateBroadcast: false,
      frontlineCanReplyToBroadcast: true,
      supportCanCreateBroadcast: false,
      supportCanReplyToBroadcast: true,
      supervisorCanCreateBroadcast: true,
      managerCanCreateBroadcast: true,
      requireApprovalForBroadcast: false,
      allowScheduledBroadcasts: true,
      allowPriorityBroadcasts: true,
      broadcastRetentionDays: 365,
      requireAcknowledgment: true,
      acknowledgmentReminders: true,
      reminderInterval: 1440,
      maxBroadcastTargets: 1000
    }
  };

  const parseJsSettingsToRules = (jsSettings: any): OURules => {
    const base: OURules = JSON.parse(JSON.stringify(defaultRules));
    
    console.log('Parsing jsSettings:', jsSettings);
    
    if (!jsSettings) return base;
    const arr = Array.isArray(jsSettings) ? jsSettings : [jsSettings];

    for (const item of arr) {
      // Handle Chat settings
      if (item && item.Chat) {
        const chat = item.Chat;
        console.log('Processing Chat settings:', chat);
        
        if (chat.General) {
          base.chat.allowFileSharing = !!chat.General.FileSharing;
          base.chat.allowEmojis = !!chat.General.Emoji;
          if (chat.General.Retention != null) base.chat.messageRetentionDays = Number(chat.General.Retention) || base.chat.messageRetentionDays;
        }
        if (chat.Frontline) {
          base.chat.frontlineCanInitiate1v1 = !!chat.Frontline.Init1v1;
          base.chat.frontlineCanCreateGroups = !!chat.Frontline.CreateGroup;
          base.chat.frontlineCanJoinGroups = !!chat.Frontline.JoinGroupChats;
          base.chat.frontlineCanShareFiles = !!chat.Frontline.ShareFiles;
          base.chat.frontlineCanForwardMessages = !!chat.Frontline.ForwardMessage;
        }
        if (chat.support) {
          base.chat.supportCanInitiate1v1 = !!chat.support.Init1v1;
          base.chat.supportCanCreateGroups = !!chat.support.CreateGroup;
          base.chat.supportCanJoinGroups = !!chat.support.JoinGroupChats;
          base.chat.supportCanShareFiles = !!chat.support.ShareFiles;
          base.chat.supportCanForwardMessages = !!chat.support.ForwardMessage;
        }
        if (chat.supervisor) {
          base.chat.supervisorCanCreateGroups = !!chat.supervisor.CreateGroup;
          base.chat.supervisorCanShareFiles = !!chat.supervisor.ShareFiles;
          base.chat.supervisorCanForwardMessages = !!chat.supervisor.ForwardMessage;
        }
      }
      
      // Handle lowercase chat for backward compatibility
      if (item && item.chat) {
        const chat = item.chat;
        if (chat.general) {
          base.chat.allowFileSharing = !!chat.general.fileSharing;
          base.chat.allowEmojis = !!chat.general.emoji;
          if (chat.general.retention != null) base.chat.messageRetentionDays = Number(chat.general.retention) || base.chat.messageRetentionDays;
        }
        if (chat.frontline) {
          base.chat.frontlineCanInitiate1v1 = !!chat.frontline.init1v1;
          base.chat.frontlineCanCreateGroups = !!chat.frontline.createGroup;
          base.chat.frontlineCanJoinGroups = !!chat.frontline.joinGroupChats;
          base.chat.frontlineCanShareFiles = !!chat.frontline.shareFiles;
          base.chat.frontlineCanForwardMessages = !!chat.frontline.forwardMessage;
        }
        if (chat.support) {
          base.chat.supportCanInitiate1v1 = !!chat.support.init1v1;
          base.chat.supportCanCreateGroups = !!chat.support.createGroup;
          base.chat.supportCanJoinGroups = !!chat.support.joinGroupChats;
          base.chat.supportCanShareFiles = !!chat.support.shareFiles;
          base.chat.supportCanForwardMessages = !!chat.support.forwardMessage;
        }
        if (chat.supervisor) {
          base.chat.supervisorCanCreateGroups = !!chat.supervisor.createGroup;
          base.chat.supervisorCanShareFiles = !!chat.supervisor.shareFiles;
          base.chat.supervisorCanForwardMessages = !!chat.supervisor.forwardMessage;
        }
      }
      
      // Handle Broadcast settings
      if (item && item.broadcast) {
        const b = item.broadcast;
        console.log('Processing broadcast settings:', b);
        
        if (b.General) {
          base.broadcast.requireApprovalForBroadcast = !!b.General.ApprovalforBroadcast;
          base.broadcast.allowScheduledBroadcasts = !!b.General.ScheduleBroadcast;
          base.broadcast.allowPriorityBroadcasts = !!b.General.PriorityBroadcast;
          if (b.General.Retention != null) base.broadcast.broadcastRetentionDays = Number(b.General.Retention) || base.broadcast.broadcastRetentionDays;
        }
        if (b.general) {
          base.broadcast.requireApprovalForBroadcast = !!b.general.approvalforBroadcast;
          base.broadcast.allowScheduledBroadcasts = !!b.general.scheduleBroadcast;
          base.broadcast.allowPriorityBroadcasts = !!b.general.priorityBroadcast;
          if (b.general.retention != null) base.broadcast.broadcastRetentionDays = Number(b.general.retention) || base.broadcast.broadcastRetentionDays;
        }
        if (b.Frontline) {
          base.broadcast.frontlineCanCreateBroadcast = !!b.Frontline.CreateBroadcasts;
          base.broadcast.frontlineCanReplyToBroadcast = !!b.Frontline.ReplyToBroadcasts;
        }
        if (b.frontline) {
          base.broadcast.frontlineCanCreateBroadcast = !!b.frontline.createBroadcasts;
          base.broadcast.frontlineCanReplyToBroadcast = !!b.frontline.replyToBroadcasts;
        }
        if (b.support) {
          base.broadcast.supportCanCreateBroadcast = !!b.support.CreateBroadcasts || !!b.support.createBroadcasts;
          base.broadcast.supportCanReplyToBroadcast = !!b.support.ReplyToBroadcasts || !!b.support.replyToBroadcasts;
        }
        if (b.supervisor) {
          base.broadcast.supervisorCanCreateBroadcast = !!b.supervisor.CreateBroadcasts || !!b.supervisor.createBroadcasts;
        }
      }
    }

    console.log('Parsed rules result:', base);
    return base;
  };

  const mapBackendToOU = (row: any): OrganizationUnit => {
    const created = row?.tcreatedat ? new Date(row.tcreatedat) : new Date();
    const isActive = !!row?.bisActive;
    
    console.log('Mapping backend OU:', {
      id: row?.ouid || row?.did,
      name: row?.dname,
      jsSettings: row?.jsSettings
    });
    
    const rules = parseJsSettingsToRules(row?.jsSettings);
    
    const mappedOU: OrganizationUnit = {
      id: row?.ouid || row?.did || String(Date.now()),
      name: row?.dname || 'Unknown',
      description: row?.ddescription || '',
      parentId: row?.dparentouid || null,
      memberCount: Number(row?.membercount) || 0,
      location: row?.dLocation || row?.dlocation || '',
      createdAt: created,
      modifiedAt: created,
      status: isActive ? 'active' : 'inactive',
      rules,
      // Store original jsSettings for tab determination
      _originalJsSettings: row?.jsSettings
    };
    
    console.log('Mapped OU result:', mappedOU);
    return mappedOU;
  };

  // Generate sample data for demo purposes
  const generateSampleData = (): { active: OrganizationUnit[], inactive: OrganizationUnit[] } => {
    const sampleOUs: OrganizationUnit[] = [];
    let idCounter = 1;

    // Helper function to create an OU
    const createOU = (name: string, description: string, location: string, parentId: string | null = null, status: 'active' | 'inactive' = 'active', memberCount: number = 0): OrganizationUnit => ({
      id: `ou-${idCounter++}`,
      name,
      description,
      parentId,
      memberCount,
      location,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      modifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      status,
      rules: JSON.parse(JSON.stringify(defaultRules))
    });

    // Multiple Root Level Organizations
    const corporate = createOU('Corporate Headquarters', 'Main corporate office and executive leadership', 'New York, NY', null, 'active', 25);
    const manufacturing = createOU('Manufacturing Division', 'Global manufacturing operations and production facilities', 'Detroit, MI', null, 'active', 180);
    const retail = createOU('Retail Operations', 'Customer-facing retail stores and e-commerce', 'Atlanta, GA', null, 'active', 320);
    const research = createOU('Research & Development', 'Innovation labs and product development centers', 'Palo Alto, CA', null, 'active', 85);
    const consulting = createOU('Consulting Services', 'Professional consulting and advisory services', 'Boston, MA', null, 'active', 45);
    const logistics = createOU('Global Logistics', 'Supply chain and distribution network management', 'Memphis, TN', null, 'active', 150);
    
    // Root organizations with no children (standalone divisions)
    const cybersecurity = createOU('Cybersecurity Division', 'Information security and risk management services', 'Austin, TX', null, 'active', 28);
    const sustainability = createOU('Sustainability Office', 'Environmental initiatives and corporate responsibility', 'Portland, OR', null, 'active', 12);
    const ventures = createOU('Corporate Ventures', 'Strategic investments and startup partnerships', 'San Francisco, CA', null, 'inactive', 8);
    
    // Organizations with no members (newly created or transitioning)
    const newInitiatives = createOU('New Initiatives Office', 'Exploration of emerging business opportunities', 'Denver, CO', null, 'active', 0);
    const brandIncubator = createOU('Brand Incubator Lab', 'New brand development and market testing', 'Miami, FL', null, 'active', 0);
    const emergencyResponse = createOU('Emergency Response Team', 'Crisis management and business continuity', 'Remote', null, 'inactive', 0);
    
    sampleOUs.push(corporate, manufacturing, retail, research, consulting, logistics, cybersecurity, sustainability, ventures, newInitiatives, brandIncubator, emergencyResponse);

    // Regional Offices under Corporate
    const northAmerica = createOU('North America Region', 'Regional operations for North American markets', 'Chicago, IL', corporate.id, 'active', 15);
    const europe = createOU('Europe Region', 'Regional operations for European markets', 'London, UK', corporate.id, 'active', 18);
    const asiaPacific = createOU('Asia Pacific Region', 'Regional operations for Asia Pacific markets', 'Singapore', corporate.id, 'active', 12);
    sampleOUs.push(northAmerica, europe, asiaPacific);

    // Departments under Corporate
    const humanResources = createOU('Human Resources Department', 'Employee relations, recruitment, and organizational development', 'New York, NY', corporate.id, 'active', 32);
    const finance = createOU('Finance Department', 'Financial planning, accounting, and budget management', 'New York, NY', corporate.id, 'active', 28);
    const technology = createOU('Technology Department', 'Information systems, software development, and infrastructure', 'San Francisco, CA', corporate.id, 'active', 45);
    const marketing = createOU('Marketing Department', 'Brand management, advertising, and market research', 'Los Angeles, CA', corporate.id, 'active', 22);
    const operations = createOU('Operations Department', 'Supply chain, logistics, and operational efficiency', 'Dallas, TX', corporate.id, 'active', 38);
    sampleOUs.push(humanResources, finance, technology, marketing, operations);

    // Sub-departments under HR
    sampleOUs.push(
      createOU('Recruitment Team', 'Talent acquisition and hiring processes', 'New York, NY', humanResources.id, 'active', 8),
      createOU('Employee Relations', 'Employee support and conflict resolution', 'New York, NY', humanResources.id, 'active', 6),
      createOU('Training and Development', 'Employee skill development and career growth', 'New York, NY', humanResources.id, 'active', 12),
      createOU('Compensation and Benefits', 'Salary administration and employee benefits', 'New York, NY', humanResources.id, 'active', 6)
    );

    // Sub-departments under Finance
    sampleOUs.push(
      createOU('Accounting Team', 'General ledger, accounts payable and receivable', 'New York, NY', finance.id, 'active', 10),
      createOU('Financial Planning', 'Budget forecasting and strategic financial analysis', 'New York, NY', finance.id, 'active', 8),
      createOU('Audit and Compliance', 'Internal audit and regulatory compliance', 'New York, NY', finance.id, 'active', 6),
      createOU('Treasury Services', 'Cash management and investment oversight', 'New York, NY', finance.id, 'active', 4)
    );

    // Sub-departments under Technology
    sampleOUs.push(
      createOU('Software Engineering', 'Application development and maintenance', 'San Francisco, CA', technology.id, 'active', 25),
      createOU('Infrastructure Team', 'Network, servers, and cloud infrastructure', 'San Francisco, CA', technology.id, 'active', 12),
      createOU('Data Analytics', 'Business intelligence and data science', 'San Francisco, CA', technology.id, 'active', 8),
      createOU('Quality Assurance', 'Software testing and quality control', 'San Francisco, CA', technology.id, 'inactive', 6),
      createOU('DevOps Engineering', 'Deployment automation and system reliability', 'San Francisco, CA', technology.id, 'active', 10)
    );

    // Teams under Software Engineering
    const softwareEng = sampleOUs.find(ou => ou.name === 'Software Engineering')!;
    sampleOUs.push(
      createOU('Frontend Development Team', 'User interface and user experience development', 'San Francisco, CA', softwareEng.id, 'active', 8),
      createOU('Backend Development Team', 'Server-side logic and database management', 'San Francisco, CA', softwareEng.id, 'active', 10),
      createOU('Mobile Development Team', 'iOS and Android application development', 'San Francisco, CA', softwareEng.id, 'active', 7)
    );

    // Sub-departments under Marketing
    sampleOUs.push(
      createOU('Digital Marketing', 'Online advertising and social media campaigns', 'Los Angeles, CA', marketing.id, 'active', 8),
      createOU('Brand Management', 'Brand strategy and creative development', 'Los Angeles, CA', marketing.id, 'active', 6),
      createOU('Market Research', 'Consumer insights and competitive analysis', 'Los Angeles, CA', marketing.id, 'active', 5),
      createOU('Public Relations', 'Media relations and corporate communications', 'Los Angeles, CA', marketing.id, 'inactive', 3)
    );

    // Sub-departments under Operations
    sampleOUs.push(
      createOU('Supply Chain Management', 'Vendor relations and procurement processes', 'Dallas, TX', operations.id, 'active', 12),
      createOU('Logistics Coordination', 'Shipping, receiving, and warehouse management', 'Dallas, TX', operations.id, 'active', 15),
      createOU('Quality Control', 'Product quality assurance and testing', 'Dallas, TX', operations.id, 'active', 8),
      createOU('Facilities Management', 'Building maintenance and office administration', 'Dallas, TX', operations.id, 'active', 3)
    );

    // Regional sub-offices under North America
    sampleOUs.push(
      createOU('US West Coast Office', 'Operations for western United States', 'Seattle, WA', northAmerica.id, 'active', 22),
      createOU('US East Coast Office', 'Operations for eastern United States', 'Boston, MA', northAmerica.id, 'active', 18),
      createOU('Canada Office', 'Operations for Canadian markets', 'Toronto, ON', northAmerica.id, 'active', 14),
      createOU('Mexico Office', 'Operations for Mexican markets', 'Mexico City, MX', northAmerica.id, 'inactive', 8)
    );

    // Regional sub-offices under Europe
    sampleOUs.push(
      createOU('UK and Ireland Office', 'Operations for British Isles', 'London, UK', europe.id, 'active', 20),
      createOU('Germany Office', 'Operations for German markets', 'Berlin, DE', europe.id, 'active', 16),
      createOU('France Office', 'Operations for French markets', 'Paris, FR', europe.id, 'active', 12),
      createOU('Nordic Office', 'Operations for Scandinavian markets', 'Stockholm, SE', europe.id, 'active', 10),
      createOU('Southern Europe Office', 'Operations for Mediterranean markets', 'Rome, IT', europe.id, 'inactive', 8)
    );

    // Regional sub-offices under Asia Pacific
    sampleOUs.push(
      createOU('Japan Office', 'Operations for Japanese markets', 'Tokyo, JP', asiaPacific.id, 'active', 15),
      createOU('Australia Office', 'Operations for Australian and New Zealand markets', 'Sydney, AU', asiaPacific.id, 'active', 12),
      createOU('Southeast Asia Office', 'Operations for ASEAN markets', 'Bangkok, TH', asiaPacific.id, 'active', 10),
      createOU('China Office', 'Operations for Chinese markets', 'Shanghai, CN', asiaPacific.id, 'inactive', 18)
    );

    // Manufacturing Division sub-units
    sampleOUs.push(
      createOU('Production Planning', 'Manufacturing schedules and capacity management', 'Detroit, MI', manufacturing.id, 'active', 25),
      createOU('Quality Assurance Manufacturing', 'Product quality control and testing', 'Detroit, MI', manufacturing.id, 'active', 18),
      createOU('Plant Operations East', 'Eastern manufacturing facilities management', 'Cleveland, OH', manufacturing.id, 'active', 45),
      createOU('Plant Operations West', 'Western manufacturing facilities management', 'Phoenix, AZ', manufacturing.id, 'active', 38),
      createOU('Equipment Maintenance', 'Industrial equipment servicing and repairs', 'Detroit, MI', manufacturing.id, 'active', 32),
      createOU('Safety and Compliance', 'Workplace safety and regulatory compliance', 'Detroit, MI', manufacturing.id, 'active', 22)
    );

    // Retail Operations sub-units
    sampleOUs.push(
      createOU('Store Operations', 'Physical retail store management', 'Atlanta, GA', retail.id, 'active', 85),
      createOU('E-commerce Platform', 'Online sales and digital customer experience', 'Seattle, WA', retail.id, 'active', 45),
      createOU('Customer Service Center', 'Customer support and order assistance', 'Nashville, TN', retail.id, 'active', 55),
      createOU('Merchandising', 'Product placement and inventory management', 'Atlanta, GA', retail.id, 'active', 30),
      createOU('Regional Managers East', 'Eastern region store oversight', 'Miami, FL', retail.id, 'active', 28),
      createOU('Regional Managers West', 'Western region store oversight', 'Los Angeles, CA', retail.id, 'active', 25),
      createOU('Franchise Operations', 'Franchise partner support and management', 'Dallas, TX', retail.id, 'inactive', 18)
    );

    // Research & Development sub-units
    sampleOUs.push(
      createOU('Product Innovation Lab', 'New product research and prototyping', 'Palo Alto, CA', research.id, 'active', 22),
      createOU('Materials Science Team', 'Advanced materials research and testing', 'Cambridge, MA', research.id, 'active', 15),
      createOU('User Experience Research', 'Customer behavior and usability studies', 'Palo Alto, CA', research.id, 'active', 12),
      createOU('Patent Office', 'Intellectual property management and filing', 'Palo Alto, CA', research.id, 'active', 8),
      createOU('Technology Partnerships', 'External research collaborations', 'Palo Alto, CA', research.id, 'active', 6),
      createOU('Applied Research Division', 'Practical application development', 'Ann Arbor, MI', research.id, 'inactive', 10)
    );

    // Consulting Services sub-units
    sampleOUs.push(
      createOU('Strategic Consulting', 'Business strategy and transformation', 'Boston, MA', consulting.id, 'active', 18),
      createOU('Technical Consulting', 'IT and technology implementation', 'Boston, MA', consulting.id, 'active', 15),
      createOU('Change Management', 'Organizational change and training', 'Boston, MA', consulting.id, 'active', 12)
    );

    // Global Logistics sub-units
    sampleOUs.push(
      createOU('Distribution Centers', 'Warehouse and fulfillment operations', 'Memphis, TN', logistics.id, 'active', 65),
      createOU('Transportation Management', 'Fleet and shipping coordination', 'Memphis, TN', logistics.id, 'active', 35),
      createOU('Vendor Relations', 'Supplier partnerships and procurement', 'Chicago, IL', logistics.id, 'active', 28),
      createOU('Inventory Control', 'Stock management and optimization', 'Memphis, TN', logistics.id, 'active', 22)
    );

    // Add some specialized teams under Corporate
    sampleOUs.push(
      createOU('Innovation Lab', 'Research and development of emerging technologies', 'Austin, TX', corporate.id, 'active', 12),
      createOU('Customer Success Team', 'Client relationship management and support', 'Remote', corporate.id, 'active', 16),
      createOU('Legal Department', 'Corporate legal affairs and compliance', 'New York, NY', corporate.id, 'active', 8),
      createOU('Executive Office', 'CEO, COO, and executive leadership team', 'New York, NY', corporate.id, 'active', 5),
      createOU('Strategic Planning Unit', 'Long-term business strategy and market analysis', 'New York, NY', corporate.id, 'active', 0),
      createOU('Merger & Acquisitions Team', 'Corporate development and acquisition evaluation', 'New York, NY', corporate.id, 'inactive', 0)
    );

    // Add some inactive departments and root organizations
    sampleOUs.push(
      createOU('Pilot Program Office', 'Experimental initiatives and pilot projects', 'Various', corporate.id, 'inactive', 4),
      createOU('Legacy Systems Team', 'Maintenance of deprecated technology systems', 'New York, NY', technology.id, 'inactive', 3),
      createOU('Special Projects Division', 'Temporary project-based teams', 'Various', corporate.id, 'inactive', 7)
    );

    // Additional root-level inactive organizations
    sampleOUs.push(
      createOU('Aerospace Division', 'Aviation and aerospace technology development', 'Houston, TX', null, 'inactive', 65),
      createOU('Entertainment Studios', 'Media production and content creation', 'Hollywood, CA', null, 'inactive', 42),
      createOU('Agriculture Division', 'Farming operations and agricultural technology', 'Des Moines, IA', null, 'inactive', 28)
    );

    // Some children for inactive Aerospace Division
    sampleOUs.push(
      createOU('Flight Testing', 'Aircraft and component testing operations', 'Houston, TX', sampleOUs.find(ou => ou.name === 'Aerospace Division')?.id || '', 'inactive', 25),
      createOU('Aerospace Engineering', 'Design and development of aerospace systems', 'Houston, TX', sampleOUs.find(ou => ou.name === 'Aerospace Division')?.id || '', 'inactive', 40)
    );

    const active = sampleOUs.filter(ou => ou.status === 'active');
    const inactive = sampleOUs.filter(ou => ou.status === 'inactive');

    return { active, inactive };
  };

  const loadLists = async () => {
    isLoading = true;
    loadError = '';
    try {
      // For demo purposes, use sample data instead of API calls
      // Uncomment the lines below to use real API data
      /*
      const [activeRes, inactiveRes] = await Promise.all([
        getActiveOUs({ start: 0, limit: 50, sort: 'ASC', sortby: 'dname' }),
        getInactiveOUs({ start: 0, limit: 50, sort: 'ASC', sortby: 'dname' })
      ]);

      const activeRows = (activeRes.data as any)?.data || [];
      const inactiveRows = (inactiveRes.data as any)?.data || [];

      activeList = activeRows.map(mapBackendToOU);
      inactiveList = inactiveRows.map(mapBackendToOU);
      */
      
      // Use sample data for demo
      const sampleData = generateSampleData();
      activeList = sampleData.active;
      inactiveList = sampleData.inactive;
      
      organizationUnits = currentTab === 'active' ? activeList : inactiveList;
    } catch (e) {
      console.error(e);
      loadError = 'Failed to load organization units';
    } finally {
      isLoading = false;
    }
  };

  onMount(() => {
    loadLists();
  });

  let newOU = $state({
    name: '',
    description: '',
    location: '',
    rules: {
      chat: {
        frontlineCanInitiate1v1: true,
        frontlineCanCreateGroups: false,
        frontlineCanJoinGroups: true,
        frontlineCanShareFiles: false,
        frontlineCanForwardMessages: false,
        supportCanInitiate1v1: true,
        supportCanCreateGroups: false,
        supportCanJoinGroups: true,
        supportCanShareFiles: true,
        supportCanForwardMessages: true,
        supervisorCanCreateGroups: true,
        supervisorCanShareFiles: true,
        supervisorCanForwardMessages: true,
        managerCanAccessAllGroups: true,
        managerCanShareFiles: true,
        managerCanForwardMessages: true,
        allowFileSharing: true,
        allowEmojis: true,
        messageRetentionDays: 365,
        maxFileSize: 10,
        allowedFileTypes: false,
        maxGroupSize: 50,
        messageEditWindow: 15,
        pinnedMessages: {
          enabled: true,
          maxPinnedPerConversation: 10
        }
      },
      broadcast: {
        frontlineCanCreateBroadcast: false,
        frontlineCanReplyToBroadcast: true,
        supportCanCreateBroadcast: false,
        supportCanReplyToBroadcast: true,
        supervisorCanCreateBroadcast: true,
        managerCanCreateBroadcast: true,
        requireApprovalForBroadcast: false,
        allowScheduledBroadcasts: true,
        allowPriorityBroadcasts: true,
        broadcastRetentionDays: 365,
        requireAcknowledgment: true,
        acknowledgmentReminders: true,
        reminderInterval: 1440,
        maxBroadcastTargets: 1000
      }
    }
  });

  // Computed values
  const tabCounts = $derived.by(() => {
    const matches = (list: OrganizationUnit[]) => {
      if (!searchQuery) return list.length;
      const q = searchQuery.toLowerCase();
      return list.filter(ou =>
        ou.name.toLowerCase().includes(q) ||
        ou.description.toLowerCase().includes(q) ||
        ou.location.toLowerCase().includes(q)
      ).length;
    };
    return {
      active: matches(activeList),
      inactive: matches(inactiveList)
    };
  });

  // Build hierarchical structure
  const hierarchicalOUs = $derived.by(() => {
    const currentList = currentTab === 'active' ? activeList : inactiveList;
    let filtered = currentList;

    // Filter by search
    if (searchQuery) {
      filtered = currentList.filter(ou =>
        ou.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ou.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ou.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Build hierarchy
    const rootNodes: (OrganizationUnit & { children?: OrganizationUnit[] })[] = [];
    const nodeMap = new Map<string, OrganizationUnit & { children?: OrganizationUnit[] }>();

    // First pass: create nodes
    filtered.forEach(ou => {
      nodeMap.set(ou.id, { ...ou, children: [] });
    });

    // Second pass: build hierarchy
    filtered.forEach(ou => {
      const node = nodeMap.get(ou.id)!;
      if (ou.parentId && nodeMap.has(ou.parentId)) {
        const parent = nodeMap.get(ou.parentId)!;
        parent.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  });

  // Functions
  const createOU = async () => {
    if (newOU.name.trim() && newOU.description.trim()) {
      // Clear previous messages
      apiError = '';
      apiSuccess = '';
      isCreatingOU = true;

      try {
        // Transform frontend data to backend API format
        // Only send settings for the currently active tab
        const apiData = transformOUDataForAPI(newOU, activeRulesTab);
        
        // Add parent ID if creating a child OU
        if (parentOUForNewChild) {
          apiData.parentId = parentOUForNewChild.id;
        }
        
        // Call the API
        const result = await createOUAPI(apiData);
        
        if (result.success) {
          // Create local OU object for immediate UI update
          const ou: OrganizationUnit = {
            id: result.data?.id || Date.now().toString(),
            name: newOU.name.trim(),
            description: newOU.description.trim(),
            parentId: parentOUForNewChild?.id || null,
            memberCount: 0,
            location: newOU.location.trim(),
            createdAt: new Date(),
            modifiedAt: new Date(),
            status: 'active',
            rules: newOU.rules
          };

          // Update the local state
          activeList = [ou, ...activeList];
          organizationUnits = currentTab === 'active' ? activeList : inactiveList;
          
          // Show success message
          apiSuccess = result.message || 'Organization Unit created successfully!';
          
          // Reset form
          resetNewOUForm();
          
          // Close modal after a short delay to show success message
          setTimeout(() => {
            showCreateModal = false;
            apiSuccess = '';
            parentOUForNewChild = null;
          }, 2000);
          
        } else {
          // Handle API error
          apiError = result.error || 'Failed to create Organization Unit';
        }
      } catch (error) {
        console.error('Error creating OU:', error);
        apiError = 'Network error: Failed to create Organization Unit';
      } finally {
        isCreatingOU = false;
      }
    }
  };

  // Helper function to reset the form
  const resetNewOUForm = () => {
    newOU = {
      name: '',
      description: '',
      location: '',
      rules: {
        chat: {
          frontlineCanInitiate1v1: true,
          frontlineCanCreateGroups: false,
          frontlineCanJoinGroups: true,
          frontlineCanShareFiles: false,
          frontlineCanForwardMessages: false,
          supportCanInitiate1v1: true,
          supportCanCreateGroups: false,
          supportCanJoinGroups: true,
          supportCanShareFiles: true,
          supportCanForwardMessages: true,
          supervisorCanCreateGroups: true,
          supervisorCanShareFiles: true,
          supervisorCanForwardMessages: true,
          managerCanAccessAllGroups: true,
          managerCanShareFiles: true,
          managerCanForwardMessages: true,
          allowFileSharing: true,
          allowEmojis: true,
          messageRetentionDays: 365,
          maxFileSize: 10,
          allowedFileTypes: false,
          maxGroupSize: 50,
          messageEditWindow: 15,
          pinnedMessages: {
            enabled: true,
            maxPinnedPerConversation: 10
          }
        },
        broadcast: {
          frontlineCanCreateBroadcast: false,
          frontlineCanReplyToBroadcast: true,
          supportCanCreateBroadcast: false,
          supportCanReplyToBroadcast: true,
          supervisorCanCreateBroadcast: true,
          managerCanCreateBroadcast: true,
          requireApprovalForBroadcast: false,
          allowScheduledBroadcasts: true,
          allowPriorityBroadcasts: true,
          broadcastRetentionDays: 365,
          requireAcknowledgment: true,
          acknowledgmentReminders: true,
          reminderInterval: 1440,
          maxBroadcastTargets: 1000
        }
      }
    };
  };

  // Helper function to determine which tab should be active based on jsSettings
  const determinePrimarySettingsTab = (jsSettings: any): 'chat' | 'broadcast' => {
    if (!jsSettings) return 'chat'; // default to chat
    
    const arr = Array.isArray(jsSettings) ? jsSettings : [jsSettings];
    
    // Check if any item has broadcast settings
    const hasBroadcast = arr.some(item => item && item.broadcast);
    const hasChat = arr.some(item => item && (item.Chat || item.chat));
    
    console.log('Settings analysis:', { hasBroadcast, hasChat, jsSettings });
    
    // If only broadcast settings exist, show broadcast tab
    if (hasBroadcast && !hasChat) {
      return 'broadcast';
    }
    
    // If both exist, check which has more substantial settings
    if (hasBroadcast && hasChat) {
      // Count non-default broadcast settings
      let broadcastSettingsCount = 0;
      let chatSettingsCount = 0;
      
      arr.forEach(item => {
        if (item.broadcast) {
          if (item.broadcast.general) broadcastSettingsCount += Object.keys(item.broadcast.general).length;
          if (item.broadcast.frontline) broadcastSettingsCount += Object.keys(item.broadcast.frontline).length;
          if (item.broadcast.support) broadcastSettingsCount += Object.keys(item.broadcast.support).length;
          if (item.broadcast.supervisor) broadcastSettingsCount += Object.keys(item.broadcast.supervisor).length;
        }
        
        if (item.Chat || item.chat) {
          const chatSettings = item.Chat || item.chat;
          if (chatSettings.General || chatSettings.general) chatSettingsCount += Object.keys(chatSettings.General || chatSettings.general).length;
          if (chatSettings.Frontline || chatSettings.frontline) chatSettingsCount += Object.keys(chatSettings.Frontline || chatSettings.frontline).length;
          if (chatSettings.support) chatSettingsCount += Object.keys(chatSettings.support).length;
          if (chatSettings.supervisor) chatSettingsCount += Object.keys(chatSettings.supervisor).length;
        }
      });
      
      console.log('Settings count:', { broadcastSettingsCount, chatSettingsCount });
      
      // If broadcast has more settings, show broadcast tab
      if (broadcastSettingsCount > chatSettingsCount) {
        return 'broadcast';
      }
    }
    
    // Default to chat
    return 'chat';
  };

  const editOUFunction = (ou: OrganizationUnit) => {
    selectedOU = ou;
    
    // Determine which tab should be active based on original jsSettings
    const primaryTab = determinePrimarySettingsTab(ou._originalJsSettings);
    activeRulesTab = primaryTab;
    
    console.log('Setting active tab to:', primaryTab, 'based on jsSettings:', ou._originalJsSettings);
    
    // Deep copy the rules to ensure all nested properties are properly copied
    editOU = {
      name: ou.name,
      description: ou.description,
      location: ou.location,
      status: ou.status,
      rules: {
        chat: {
          frontlineCanInitiate1v1: ou.rules.chat.frontlineCanInitiate1v1,
          frontlineCanCreateGroups: ou.rules.chat.frontlineCanCreateGroups,
          frontlineCanJoinGroups: ou.rules.chat.frontlineCanJoinGroups,
          frontlineCanShareFiles: ou.rules.chat.frontlineCanShareFiles,
          frontlineCanForwardMessages: ou.rules.chat.frontlineCanForwardMessages,
          supportCanInitiate1v1: ou.rules.chat.supportCanInitiate1v1,
          supportCanCreateGroups: ou.rules.chat.supportCanCreateGroups,
          supportCanJoinGroups: ou.rules.chat.supportCanJoinGroups,
          supportCanShareFiles: ou.rules.chat.supportCanShareFiles,
          supportCanForwardMessages: ou.rules.chat.supportCanForwardMessages,
          supervisorCanCreateGroups: ou.rules.chat.supervisorCanCreateGroups,
          supervisorCanShareFiles: ou.rules.chat.supervisorCanShareFiles,
          supervisorCanForwardMessages: ou.rules.chat.supervisorCanForwardMessages,
          managerCanAccessAllGroups: ou.rules.chat.managerCanAccessAllGroups,
          managerCanShareFiles: ou.rules.chat.managerCanShareFiles,
          managerCanForwardMessages: ou.rules.chat.managerCanForwardMessages,
          allowFileSharing: ou.rules.chat.allowFileSharing,
          allowEmojis: ou.rules.chat.allowEmojis,
          messageRetentionDays: ou.rules.chat.messageRetentionDays,
          maxFileSize: ou.rules.chat.maxFileSize,
          allowedFileTypes: ou.rules.chat.allowedFileTypes,
          maxGroupSize: ou.rules.chat.maxGroupSize,
          messageEditWindow: ou.rules.chat.messageEditWindow,
          pinnedMessages: {
            enabled: ou.rules.chat.pinnedMessages.enabled,
            maxPinnedPerConversation: ou.rules.chat.pinnedMessages.maxPinnedPerConversation
          }
        },
        broadcast: {
          frontlineCanCreateBroadcast: ou.rules.broadcast.frontlineCanCreateBroadcast,
          frontlineCanReplyToBroadcast: ou.rules.broadcast.frontlineCanReplyToBroadcast,
          supportCanCreateBroadcast: ou.rules.broadcast.supportCanCreateBroadcast,
          supportCanReplyToBroadcast: ou.rules.broadcast.supportCanReplyToBroadcast,
          supervisorCanCreateBroadcast: ou.rules.broadcast.supervisorCanCreateBroadcast,
          managerCanCreateBroadcast: ou.rules.broadcast.managerCanCreateBroadcast,
          requireApprovalForBroadcast: ou.rules.broadcast.requireApprovalForBroadcast,
          allowScheduledBroadcasts: ou.rules.broadcast.allowScheduledBroadcasts,
          allowPriorityBroadcasts: ou.rules.broadcast.allowPriorityBroadcasts,
          broadcastRetentionDays: ou.rules.broadcast.broadcastRetentionDays,
          requireAcknowledgment: ou.rules.broadcast.requireAcknowledgment,
          acknowledgmentReminders: ou.rules.broadcast.acknowledgmentReminders,
          reminderInterval: ou.rules.broadcast.reminderInterval,
          maxBroadcastTargets: ou.rules.broadcast.maxBroadcastTargets
        }
      }
    };
    
    console.log('Edit OU - Original OU rules:', ou.rules);
    console.log('Edit OU - Copied editOU rules:', editOU.rules);
    
    showEditModal = true;
  };

  const saveEditOU = async () => {
    if (!selectedOU || !editOU) return;
    
    if (editOU.name?.trim() && editOU.description?.trim()) {
      // Build backend changes payload
      const apiData = transformOUDataForAPI(
        {
          name: editOU.name!.trim(),
          description: editOU.description!.trim(),
          location: editOU.location?.trim() || '',
          rules: editOU.rules
        } as any,
        activeRulesTab
      );

      const changes: any = {
        OrgName: apiData.OrgName,
        Description: apiData.Description,
        Location: apiData.Location,
        Settings: apiData.Settings
      };

      if (editOU.status) {
        changes.isactive = editOU.status === 'active';
      }

      const res = await updateOUAPI({ id: selectedOU.id, changes });
      if (!res.success) {
        alert(res.error || 'Failed to update Organization Unit');
        return;
      }

      organizationUnits = organizationUnits.map(ou =>
        ou.id === selectedOU!.id
          ? {
              ...ou,
              name: editOU!.name!.trim(),
              description: editOU!.description!.trim(),
              location: editOU!.location?.trim() || '',
              modifiedAt: new Date(),
              status: editOU!.status || 'active',
              rules: editOU!.rules || ou.rules
            }
          : ou
      );
      
      showEditModal = false;
      editOU = null;
      selectedOU = null;
      alert('Organization Unit updated successfully!');
    }
  };  const confirmDeleteOU = (ou: OrganizationUnit) => {
    selectedOU = ou;
    actionConfirm = {
      message: `Are you sure you want to delete "${ou.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      action: () => {
        if (selectedOU) {
          organizationUnits = organizationUnits.filter(u => u.id !== selectedOU!.id);
          showConfirmationModal = false;
          selectedOU = null;
          actionConfirm = null;
          alert('Organization Unit deleted successfully!');
        }
      }
    };
    showConfirmationModal = true;
  };

  const executeConfirmedAction = () => {
    if (actionConfirm) {
      actionConfirm.action();
    }
  };



  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const toggleRule = (category: 'chat' | 'broadcast', rule: string, isEdit = false) => {
    const target = isEdit ? editOU : newOU;
    if (category === 'chat') {
      // @ts-ignore
      target.rules.chat[rule] = !target.rules.chat[rule];
    } else {
      // @ts-ignore
      target.rules.broadcast[rule] = !target.rules.broadcast[rule];
    }
  };

  // Tab change function
  const changeTab = (tab: string) => {
    currentTab = tab;
    selectedOU = null; // Clear selection when switching tabs
    organizationUnits = currentTab === 'active' ? activeList : inactiveList;
  };

  // Directory navigation functions
  const toggleExpand = (ouId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(ouId)) {
      newExpanded.delete(ouId);
    } else {
      newExpanded.add(ouId);
    }
    expandedNodes = newExpanded;
  };

  const selectOU = (ou: OrganizationUnit) => {
    selectedOU = ou;
  };

  // Deactivate function (instead of delete)
  const confirmDeactivateOU = (ou: OrganizationUnit) => {
    actionConfirm = {
      message: `Are you sure you want to deactivate "${ou.name}"? This will make it inactive but preserve all data.`,
      confirmText: 'Deactivate',
      action: () => deactivateOU(ou.id)
    };
    showConfirmationModal = true;
  };

  const deactivateOU = async (ouId: string) => {
    try {
      const res = await deactivateOUAPI(ouId);
      if (!res.success) throw new Error(res.error || 'Failed');
      const found = activeList.find(ou => ou.id === ouId);
      if (found) {
        const updated = { ...found, status: 'inactive' as const, modifiedAt: new Date() };
        activeList = activeList.filter(ou => ou.id !== ouId);
        inactiveList = [updated, ...inactiveList];
        organizationUnits = currentTab === 'active' ? activeList : inactiveList;
      }
      alert('Organization Unit deactivated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to deactivate Organization Unit.');
    } finally {
      showConfirmationModal = false;
      selectedRows = new Set();
    }
  };

  // Reactivate function
  const reactivateOU = async (ouId: string) => {
    try {
      const res = await reactivateOUAPI(ouId);
      if (!res.success) throw new Error(res.error || 'Failed');
      
      // Move from inactive to active list
      const found = inactiveList.find(ou => ou.id === ouId);
      if (found) {
        const updated = { ...found, status: 'active' as const, modifiedAt: new Date() };
        inactiveList = inactiveList.filter(ou => ou.id !== ouId);
        activeList = [updated, ...activeList];
        organizationUnits = currentTab === 'inactive' ? inactiveList : activeList;
      }
      alert('Organization Unit reactivated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to reactivate Organization Unit.');
    }
  };
</script>

<!-- Tree Node Component -->
{#snippet ouTreeNode(ou: OrganizationUnit & { children?: OrganizationUnit[] }, depth: number)}
  <div class="w-full">
    <div 
      class="flex items-center py-2 px-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors {selectedOU?.id === ou.id ? 'bg-blue-50 border-l-4 border-[#01c0a4]' : ''}"
      style="margin-left: {depth * 16}px"
      onclick={() => selectOU(ou)}
    >
      <!-- Expand/Collapse Button -->
      {#if ou.children && ou.children.length > 0}
        <button
          onclick={(e) => { e.stopPropagation(); toggleExpand(ou.id); }}
          class="mr-1 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {#if expandedNodes.has(ou.id)}
            <ChevronDown class="w-4 h-4 text-gray-500" />
          {:else}
            <ChevronRight class="w-4 h-4 text-gray-500" />
          {/if}
        </button>
      {:else}
        <div class="w-6 h-6 mr-1"></div>
      {/if}

      <!-- OU Icon and Info -->
      <div class="flex items-center space-x-2 flex-1 min-w-0">
        <div class="h-6 w-6 rounded bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center flex-shrink-0">
          <Building2 class="w-3 h-3 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-900 truncate">{ou.name}</div>
          {#if ou.memberCount > 0}
            <div class="text-xs text-gray-500">{ou.memberCount} members</div>
          {/if}
        </div>
        <div class="flex-shrink-0">
          <span class="w-2 h-2 rounded-full {ou.status === 'active' ? 'bg-green-400' : 'bg-red-400'}"></span>
        </div>
      </div>
    </div>

    <!-- Children -->
    {#if ou.children && ou.children.length > 0 && expandedNodes.has(ou.id)}
      {#each ou.children as child}
        {@render ouTreeNode(child, depth + 1)}
      {/each}
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>OU Management - Admin Controls</title>
</svelte:head>

<div class="p-6 bg-gray-50 min-h-screen space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between fade-in">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 mb-1">Organization Unit Management</h1>
      <p class="text-sm text-gray-600">Manage organizational structure and communication policies</p>
    </div>
  </div>

  <!-- Main Layout: Directory + Details -->
  <div class="collaboration-card fade-in">
    <div class="flex h-[calc(100vh-200px)]">
      <!-- Left Side: Directory Tree -->
      <div class="w-1/4 border-r border-gray-200 flex flex-col">
        <!-- Header with Search and Create Button -->
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Organization Units</h3>
            <button
              onclick={() => { parentOUForNewChild = null; showCreateModal = true; }}
              class="primary-button flex items-center space-x-2 text-sm px-3 py-2"
            >
              <Plus class="w-4 h-4" />
              <span>Create OU</span>
            </button>
          </div>
          
          <div class="relative mb-4">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              bind:value={searchQuery}
              type="text"
              placeholder="Search organization units..."
              class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01c0a4] focus:border-transparent text-sm"
            />
          </div>

          <!-- Tabs -->
          <div class="grid grid-cols-2 gap-1">
            <button
              onclick={() => changeTab('active')}
              class="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors {currentTab === 'active' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Building2 class="w-4 h-4" />
              <span>Activated ({tabCounts.active})</span>
            </button>

            <button
              onclick={() => changeTab('inactive')}
              class="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors {currentTab === 'inactive' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <X class="w-4 h-4" />
              <span>Deactivated ({tabCounts.inactive})</span>
            </button>
          </div>
        </div>

        <!-- Directory Tree -->
        <div class="flex-1 overflow-y-auto p-4">
          {#each hierarchicalOUs as ou}
            {@render ouTreeNode(ou, 0)}
          {/each}

          {#if hierarchicalOUs.length === 0}
            <div class="text-center py-8">
              <Building2 class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p class="text-gray-500 text-sm">
                {searchQuery ? 'No units match your search.' : 'No organization units found.'}
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Side: Details Panel -->
      <div class="w-3/4 flex flex-col">
        {#if selectedOU}
          <!-- Check if this OU has children to determine view type -->
          {@const currentList = currentTab === 'active' ? activeList : inactiveList}
          {@const hasChildren = currentList.some(ou => ou.parentId === selectedOU.id)}
          
          <!-- OU Header -->
          <div class="p-6 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="h-12 w-12 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                  <Building2 class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-900">{selectedOU.name}</h2>
                  <p class="text-gray-600">{selectedOU.description}</p>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                {#if hasChildren}
                  <button
                    onclick={() => showParentDetailsModal = true}
                    class="flex items-center space-x-1 px-3 py-1.5 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                  >
                    <FileText class="w-3 h-3" />
                    <span>Details</span>
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            {#if hasChildren}
              <!-- Parent OU View: Show Children in Table -->
              <div class="p-6">
                <div class="mb-6">
                  <p class="text-sm text-gray-600">Handles day-to-day office operations, procurement, facility management, and administrative support.</p>
                </div>
                
                <div class="bg-white rounded-lg border border-gray-200">
                  <div class="px-6 py-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <h3 class="text-lg font-semibold text-gray-900">Sub-Organization Units</h3>
                      </div>
                      <button
                        onclick={() => { parentOUForNewChild = selectedOU; showCreateModal = true; }}
                        class="flex items-center space-x-2 px-3 py-1.5 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors text-sm"
                      >
                        <Plus class="w-3 h-3" />
                        <span>Add Child OU</span>
                      </button>
                    </div>
                  </div>
                  
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200">
                        {#each currentList.filter(ou => ou.parentId === selectedOU.id) as childOU}
                          <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-3">
                                <div class="h-8 w-8 rounded bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
                                  <Building2 class="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div class="text-sm font-medium text-gray-900">{childOU.name}</div>
                                  <div class="text-sm text-gray-500">{childOU.location || 'No location specified'}</div>
                                </div>
                              </div>
                            </td>
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-1">
                                <Users class="w-3 h-3 text-gray-400" />
                                <span class="text-sm text-gray-900">{childOU.memberCount}</span>
                              </div>
                            </td>
                            <td class="px-6 py-4">
                              <span class="px-2 py-1 text-xs font-medium rounded-full {childOU.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                {childOU.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td class="px-6 py-4">
                              <span class="text-sm text-gray-600">Organization Unit</span>
                            </td>
                            <td class="px-6 py-4">
                              <div class="flex items-center space-x-2">
                                <!-- Details Button - Calm blue style -->
                                <button
                                  onclick={() => selectOU(childOU)}
                                  class="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 text-sm font-medium rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                                >
                                  Details
                                </button>
                                <!-- Edit Button - Compact with icon -->
                                <button
                                  onclick={() => editOUFunction(childOU)}
                                  class="group flex items-center space-x-1.5 px-3 py-1.5 bg-[#01c0a4]/10 text-[#01c0a4] hover:bg-[#01c0a4] hover:text-white text-sm font-medium rounded-lg transition-all duration-200"
                                >
                                  <Edit class="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Child OU View: Show Detailed Configuration -->
              <div class="p-6">
                <!-- Basic Information -->
                <div class="grid grid-cols-2 gap-6 mb-8">
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Location</label>
                      <div class="flex items-center space-x-2">
                        <MapPin class="w-4 h-4 text-gray-400" />
                        <span class="text-gray-900">{selectedOU.location || 'Not specified'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Members</label>
                      <div class="flex items-center space-x-2">
                        <Users class="w-4 h-4 text-gray-400" />
                        <span class="text-gray-900">{selectedOU.memberCount} people</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
                      <span class="text-gray-900">{formatDate(selectedOU.createdAt)}</span>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-500 mb-1">Last Modified</label>
                      <span class="text-gray-900">{formatDate(selectedOU.modifiedAt)}</span>
                    </div>
                  </div>
                </div>

                <!-- Rules & Policies Preview -->
                <div class="mb-8">
                  <h3 class="text-lg font-semibold text-gray-900 mb-4">Rules & Policies</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <div class="flex items-center space-x-2 mb-2">
                        <MessageCircle class="w-4 h-4 text-[#01c0a4]" />
                        <span class="font-medium text-gray-900">Chat Permissions</span>
                      </div>
                      <div class="space-y-1 text-sm text-gray-600">
                        <div>File Sharing: {selectedOU.rules.chat.allowFileSharing ? 'Enabled' : 'Disabled'}</div>
                        <div>Group Creation: {selectedOU.rules.chat.frontlineCanCreateGroups ? 'All Users' : 'Restricted'}</div>
                        <div>Message Retention: {selectedOU.rules.chat.messageRetentionDays} days</div>
                      </div>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                      <div class="flex items-center space-x-2 mb-2">
                        <Radio class="w-4 h-4 text-[#01c0a4]" />
                        <span class="font-medium text-gray-900">Broadcast Permissions</span>
                      </div>
                      <div class="space-y-1 text-sm text-gray-600">
                        <div>Create Broadcasts: {selectedOU.rules.broadcast.frontlineCanCreateBroadcast ? 'All Users' : 'Restricted'}</div>
                        <div>Approval Required: {selectedOU.rules.broadcast.requireApprovalForBroadcast ? 'Yes' : 'No'}</div>
                        <div>Retention: {selectedOU.rules.broadcast.broadcastRetentionDays} days</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="border-t border-gray-200 pt-6">
                  <div class="flex justify-end gap-3">
                    <button
                      onclick={() => confirmDeleteOU(selectedOU)}
                      class="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 class="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    
                    {#if selectedOU.status === 'active'}
                      <button
                        onclick={() => confirmDeactivateOU(selectedOU)}
                        class="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        <X class="w-4 h-4" />
                        <span>Deactivate</span>
                      </button>
                    {:else}
                      <button
                        onclick={() => reactivateOU(selectedOU.id)}
                        class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <UserCheck class="w-4 h-4" />
                        <span>Reactivate</span>
                      </button>
                    {/if}
                    
                    <button
                      onclick={() => editOUFunction(selectedOU)}
                      class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                    >
                      <Edit class="w-4 h-4" />
                      <span>Edit Details</span>
                    </button>
                    
                    <button
                      onclick={() => { parentOUForNewChild = selectedOU; showCreateModal = true; }}
                      class="flex items-center space-x-2 px-4 py-2 bg-[#01c0a4] text-white rounded-lg hover:bg-[#00a085] transition-colors"
                    >
                      <Plus class="w-4 h-4" />
                      <span>Add Child OU</span>
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <Building2 class="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 class="text-xl font-semibold text-gray-600 mb-2">Select an Organization Unit</h3>
              <p class="text-gray-500">Choose an OU from the directory to view its details and manage settings.</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Create OU Modal -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => { showCreateModal = false; parentOUForNewChild = null; }}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex h-full">
        <!-- Left Side - Form -->
        <div class="w-1/2 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">{parentOUForNewChild ? `Create Child OU under "${parentOUForNewChild.name}"` : 'Create Organization Unit'}</h2>
            <button onclick={() => { showCreateModal = false; parentOUForNewChild = null; }} class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Error/Success Messages -->
          {#if apiError}
            <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800">{apiError}</p>
                </div>
              </div>
            </div>
          {/if}

          {#if apiSuccess}
            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-green-800">{apiSuccess}</p>
                </div>
              </div>
            </div>
          {/if}

          <!-- Parent OU Context (when creating child) -->
          {#if parentOUForNewChild}
            <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center space-x-2">
                <Building2 class="w-4 h-4 text-blue-600" />
                <span class="text-sm font-medium text-blue-900">Parent Organization:</span>
                <span class="text-sm text-blue-800">{parentOUForNewChild.name}</span>
              </div>
              <p class="text-xs text-blue-600 mt-1">This new OU will be created as a child under the selected parent organization.</p>
            </div>
          {/if}

          <form onsubmit={(e) => { e.preventDefault(); createOU(); }} class="space-y-6">
            <div>
              <label for="name" class="block text-sm font-semibold text-gray-700 mb-2">Organization Unit Name</label>
              <input
                id="name"
                bind:value={newOU.name}
                placeholder="Enter unit name"
                required
                disabled={isCreatingOU}
                class="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                id="description"
                bind:value={newOU.description}
                placeholder="Describe the purpose and responsibilities of this unit"
                required
                rows="3"
                disabled={isCreatingOU}
                class="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="location" class="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  id="location"
                  bind:value={newOU.location}
                  placeholder="Enter location"
                  disabled={isCreatingOU}
                  class="input-field disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div class="flex space-x-3 pt-6">
              <button 
                type="submit" 
                disabled={isCreatingOU}
                class="primary-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {#if isCreatingOU}
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                {:else}
                  Create Organization Unit
                {/if}
              </button>
              <button
                type="button"
                onclick={() => {
                  showCreateModal = false;
                  apiError = '';
                  apiSuccess = '';
                }}
                disabled={isCreatingOU}
                class="secondary-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Right Side - Rules and Policies -->
        <div class="w-1/2 p-6 bg-gray-50">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">Rules & Policies</h3>
          
          <!-- Tab Navigation -->
          <div class="flex space-x-4 mb-6">
            <button
              onclick={() => activeRulesTab = 'chat'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'chat' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onclick={() => activeRulesTab = 'broadcast'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'broadcast' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Radio class="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          </div>

          <!-- Chat Rules -->
          {#if activeRulesTab === 'chat'}
            <div class="space-y-4 max-h-127 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanJoinGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.frontlineCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.frontlineCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanInitiate1v1')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanJoinGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supportCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supportCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanCreateGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.supervisorCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.supervisorCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can access all group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanAccessAllGroups')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanAccessAllGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanAccessAllGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanShareFiles')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanForwardMessages')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.managerCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.managerCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Chat Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow file sharing</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowFileSharing')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow emojis and reactions</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowEmojis')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.chat.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.chat.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Message retention (days)</label>
                    <input
                      type="number"
                      bind:value={newOU.rules.chat.messageRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Broadcast Rules -->
          {#if activeRulesTab === 'broadcast'}
            <div class="space-y-4 max-h-127 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.frontlineCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.frontlineCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanReplyToBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.frontlineCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.frontlineCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supportCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supportCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanReplyToBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supportCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supportCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supervisorCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.supervisorCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.supervisorCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'managerCanCreateBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.managerCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.managerCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Broadcast Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Require approval for broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'requireApprovalForBroadcast')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.requireApprovalForBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.requireApprovalForBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow scheduled broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowScheduledBroadcasts')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.allowScheduledBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.allowScheduledBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow priority broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowPriorityBroadcasts')}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {newOU.rules.broadcast.allowPriorityBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {newOU.rules.broadcast.allowPriorityBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Broadcast retention (days)</label>
                    <input
                      type="number"
                      bind:value={newOU.rules.broadcast.broadcastRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}


<!-- Edit OU Modal -->
{#if showEditModal && editOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showEditModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex h-full">
        <!-- Left Side - Form -->
        <div class="w-1/2 p-6 border-r border-gray-200">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Edit Organization Unit</h2>
            <button onclick={() => showEditModal = false} class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onsubmit={(e) => { e.preventDefault(); saveEditOU(); }} class="space-y-6">
            <div>
              <label for="edit-name" class="block text-sm font-semibold text-gray-700 mb-2">Organization Unit Name</label>
              <input
                id="edit-name"
                bind:value={editOU.name}
                placeholder="Enter unit name"
                required
                class="input-field"
              />
            </div>

            <div>
              <label for="edit-description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                id="edit-description"
                bind:value={editOU.description}
                placeholder="Describe the purpose and responsibilities of this unit"
                required
                rows="3"
                class="input-field resize-none"
              ></textarea>
            </div>

            <div>
              <label for="edit-location" class="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <input
                id="edit-location"
                bind:value={editOU.location}
                placeholder="Enter location"
                class="input-field"
              />
            </div>

            <div>
              <label for="edit-status" class="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select id="edit-status" bind:value={editOU.status} class="input-field">
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>

            <div class="flex space-x-3 pt-6">
              <button type="submit" class="primary-button flex-1">
                Save Changes
              </button>
              <button
                type="button"
                onclick={() => showEditModal = false}
                class="secondary-button flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Right Side - Rules and Policies -->
        <div class="w-1/2 p-6 bg-gray-50">
          <h3 class="text-xl font-semibold text-gray-900 mb-6">Rules & Policies</h3>
          
          <!-- Tab Navigation -->
          <div class="flex space-x-4 mb-6">
            <button
              onclick={() => activeRulesTab = 'chat'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'chat' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <MessageCircle class="w-4 h-4" />
              <span>Chat</span>
            </button>
            <button
              onclick={() => activeRulesTab = 'broadcast'}
              class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors {activeRulesTab === 'broadcast' ? 'bg-[#01c0a4] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}"
            >
              <Radio class="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          </div>

          <!-- Chat Rules -->
          {#if activeRulesTab === 'chat'}
            <div class="space-y-4 max-h-96 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanInitiate1v1', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanJoinGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'frontlineCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.frontlineCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.frontlineCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can initiate 1:1 conversations</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanInitiate1v1', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanInitiate1v1 ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanInitiate1v1 ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can join group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanJoinGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanJoinGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanJoinGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supportCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supportCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supportCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanCreateGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanCreateGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanCreateGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'supervisorCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.supervisorCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.supervisorCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can access all group chats</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanAccessAllGroups', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanAccessAllGroups ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanAccessAllGroups ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can share files</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanShareFiles', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanShareFiles ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanShareFiles ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can forward messages</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'managerCanForwardMessages', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.managerCanForwardMessages ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.managerCanForwardMessages ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Chat Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow file sharing</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowFileSharing', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.allowFileSharing ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.allowFileSharing ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow emojis and reactions</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('chat', 'allowEmojis', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.chat?.allowEmojis ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.chat?.allowEmojis ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Message retention (days)</label>
                    <input
                      type="number"
                      bind:value={editOU.rules.chat.messageRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}

          <!-- Broadcast Rules -->
          {#if activeRulesTab === 'broadcast'}
            <div class="space-y-4 max-h-96 overflow-y-auto">
              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Frontline User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.frontlineCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.frontlineCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'frontlineCanReplyToBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.frontlineCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.frontlineCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <User class="w-4 h-4 mr-2" />
                  Support User Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supportCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supportCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can reply to broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supportCanReplyToBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supportCanReplyToBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supportCanReplyToBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <UserCheck class="w-4 h-4 mr-2" />
                  Supervisor Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'supervisorCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.supervisorCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.supervisorCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield class="w-4 h-4 mr-2" />
                  Manager Permissions
                </h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Can create broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'managerCanCreateBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.managerCanCreateBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.managerCanCreateBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                </div>
              </div>

              <div class="bg-white p-4 rounded-lg border">
                <h4 class="font-semibold text-gray-900 mb-3">General Broadcast Settings</h4>
                <div class="space-y-3">
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Require approval for broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'requireApprovalForBroadcast', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.requireApprovalForBroadcast ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.requireApprovalForBroadcast ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow scheduled broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowScheduledBroadcasts', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.allowScheduledBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.allowScheduledBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <label class="flex items-center justify-between">
                    <span class="text-sm text-gray-700">Allow priority broadcasts</span>
                    <button
                      type="button"
                      onclick={() => toggleRule('broadcast', 'allowPriorityBroadcasts', true)}
                      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {editOU.rules?.broadcast?.allowPriorityBroadcasts ? 'bg-[#01c0a4]' : 'bg-gray-200'}"
                    >
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {editOU.rules?.broadcast?.allowPriorityBroadcasts ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </button>
                  </label>
                  <div>
                    <label class="block text-sm text-gray-700 mb-2">Broadcast retention (days)</label>
                    <input
                      type="number"
                      bind:value={editOU.rules.broadcast.broadcastRetentionDays}
                      min="1"
                      max="365"
                      class="input-field w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Parent OU Details Modal -->
{#if showParentDetailsModal && selectedOU}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onclick={() => showParentDetailsModal = false}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="h-12 w-12 rounded-lg bg-gradient-to-r from-[#01c0a4] to-[#00a085] flex items-center justify-center">
              <Building2 class="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{selectedOU.name}</h2>
              <p class="text-gray-600">{selectedOU.description}</p>
            </div>
          </div>
          <button onclick={() => showParentDetailsModal = false} class="text-gray-500 hover:text-gray-700">
            <X class="w-6 h-6" />
          </button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] relative">
        <!-- Basic Information -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Location</label>
              <div class="flex items-center space-x-2">
                <MapPin class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{selectedOU.location || 'Not specified'}</span>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Members</label>
              <div class="flex items-center space-x-2">
                <Users class="w-4 h-4 text-gray-400" />
                <span class="text-gray-900">{selectedOU.memberCount} people</span>
              </div>
            </div>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
              <span class="text-gray-900">{formatDate(selectedOU.createdAt)}</span>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-500 mb-1">Last Modified</label>
              <span class="text-gray-900">{formatDate(selectedOU.modifiedAt)}</span>
            </div>
          </div>
        </div>

        <!-- Rules & Policies Overview -->
        <div class="mb-20">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Rules & Policies Overview</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <MessageCircle class="w-4 h-4 text-[#01c0a4]" />
                <span class="font-medium text-gray-900">Chat Permissions</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <div>File Sharing: {selectedOU.rules.chat.allowFileSharing ? 'Enabled' : 'Disabled'}</div>
                <div>Group Creation: {selectedOU.rules.chat.frontlineCanCreateGroups ? 'All Users' : 'Restricted'}</div>
                <div>Message Retention: {selectedOU.rules.chat.messageRetentionDays} days</div>
              </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <Radio class="w-4 h-4 text-[#01c0a4]" />
                <span class="font-medium text-gray-900">Broadcast Permissions</span>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <div>Create Broadcasts: {selectedOU.rules.broadcast.frontlineCanCreateBroadcast ? 'All Users' : 'Restricted'}</div>
                <div>Approval Required: {selectedOU.rules.broadcast.requireApprovalForBroadcast ? 'Yes' : 'No'}</div>
                <div>Retention: {selectedOU.rules.broadcast.broadcastRetentionDays} days</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons - Bottom Right -->
        <div class="absolute bottom-6 right-6">
          <div class="flex space-x-2">
            <button
              onclick={() => { showParentDetailsModal = false; selectOU(selectedOU); }}
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-400 rounded-lg hover:bg-blue-500 transition-colors"
            >
              <FileText class="w-4 h-4 mr-2" />
              Details
            </button>
            
            <button
              onclick={() => { showParentDetailsModal = false; editOUFunction(selectedOU); }}
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#01c0a4] rounded-lg hover:bg-[#00a085] transition-colors"
            >
              <Edit class="w-4 h-4 mr-2" />
              Edit
            </button>
            
            {#if selectedOU.status === 'active'}
              <button
                onclick={() => { showParentDetailsModal = false; confirmDeactivateOU(selectedOU); }}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <X class="w-4 h-4 mr-2" />
                Deactivate
              </button>
            {:else}
              <button
                onclick={() => { showParentDetailsModal = false; reactivateOU(selectedOU.id); }}
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              >
                <UserCheck class="w-4 h-4 mr-2" />
                Reactivate
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmationModal && actionConfirm}
  <ConfirmationModal
    show={showConfirmationModal}
    title="Confirm Action"
    message={actionConfirm.message}
    confirmText={actionConfirm.confirmText}
    confirmStyle={
      actionConfirm.confirmText === 'Deactivate' || actionConfirm.confirmText === 'Deactivate All'
        ? 'danger'
        : actionConfirm.confirmText === 'Delete'
        ? 'danger'
        : 'primary'
    }
    onConfirm={executeConfirmedAction}
    onCancel={() => { showConfirmationModal = false; actionConfirm = null; }}
  />
{/if}
