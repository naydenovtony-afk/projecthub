/**
 * Demo Data Generator
 * Automatically generates sample projects, tasks, and updates for demo user
 */

import { supabase } from '../services/supabase.js';

/**
 * Generate demo data for demo user account
 * @returns {Promise<Object>} Result with success status and summary
 */
export async function generateDemoData() {
  try {
    console.log('🚀 Starting demo data generation...');

    // Step 1: Get demo user ID
    console.log('📝 Finding demo user...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'demo@projecthub.com')
      .single();

    if (profileError || !profile) {
      throw new Error('Demo user not found. Please create demo@projecthub.com account first');
    }

    const demoUserId = profile.id;
    console.log(`✅ Demo user found: ${demoUserId}`);

    // Step 2: Check existing data
    console.log('🔍 Checking for existing demo data...');
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', demoUserId);

    if (count > 0) {
      console.log('ℹ️  Demo data already exists');
      return {
        success: true,
        message: 'Demo data already exists',
        stats: { projects: count, tasks: 0, updates: 0 }
      };
    }

    // Step 3: Create 5 projects
    console.log('📁 Creating projects...');
    const projects = [
      {
        title: 'Research Project Alpha',
        description: 'Comprehensive research on AI applications in project management. This multi-year study examines how artificial intelligence can optimize project workflows, predict risks, and improve team collaboration.',
        project_type: 'Academic & Research',
        status: 'active',
        visibility: 'public',
        start_date: '2025-10-01',
        end_date: '2026-06-30',
        budget: 85000,
        funding_source: 'National Science Foundation',
        progress_percentage: 65,
        user_id: demoUserId
      },
      {
        title: 'Corporate Website Redesign',
        description: 'Complete overhaul of company website with modern design, improved UX, and responsive layout. Includes new CMS integration and performance optimization.',
        project_type: 'Corporate/Business',
        status: 'active',
        visibility: 'private',
        start_date: '2025-11-01',
        end_date: null,
        budget: 45000,
        funding_source: null,
        progress_percentage: 45,
        user_id: demoUserId
      },
      {
        title: 'EU Digital Skills Initiative',
        description: 'Multi-country initiative to improve digital literacy across underserved communities. Partnership with 5 EU member states to deliver training programs.',
        project_type: 'EU-Funded Project',
        status: 'planning',
        visibility: 'public',
        start_date: '2026-02-01',
        end_date: '2027-12-31',
        budget: 250000,
        funding_source: 'Erasmus+ Programme',
        progress_percentage: 15,
        user_id: demoUserId
      },
      {
        title: 'Public Health Campaign',
        description: 'Community health awareness and vaccination campaign targeting rural areas. Includes mobile clinics, educational workshops, and social media outreach.',
        project_type: 'Public Initiative',
        status: 'active',
        visibility: 'public',
        start_date: '2025-07-01',
        end_date: '2026-03-31',
        budget: 120000,
        funding_source: 'Ministry of Health',
        progress_percentage: 80,
        user_id: demoUserId
      },
      {
        title: 'Personal Portfolio Website',
        description: 'Personal developer portfolio showcasing projects, blog posts, and technical articles. Built with modern web technologies.',
        project_type: 'Personal/Other',
        status: 'completed',
        visibility: 'public',
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        budget: null,
        funding_source: null,
        progress_percentage: 100,
        user_id: demoUserId
      }
    ];

    const { data: createdProjects, error: projectsError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectsError) throw projectsError;
    console.log(`✅ Created ${createdProjects.length} projects`);

    // Step 4: Create tasks for each project
    console.log('✅ Creating tasks...');
    const allTasks = [];

    // Project 1 - Research Project Alpha
    const project1Tasks = [
      {
        project_id: createdProjects[0].id,
        title: 'Literature review and background research',
        description: 'Comprehensive review of existing literature on AI in project management',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[0].id,
        title: 'Design research methodology',
        description: 'Define research approach, data collection methods, and analysis techniques',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[0].id,
        title: 'Conduct interviews with industry experts',
        description: 'Schedule and conduct 15 interviews with PM professionals',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-02-28',
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[0].id,
        title: 'Analyze collected data',
        description: 'Statistical analysis and theme identification from interview data',
        status: 'todo',
        priority: 'high',
        due_date: '2026-04-30',
        assigned_to: null
      },
      {
        project_id: createdProjects[0].id,
        title: 'Prepare final research paper',
        description: 'Write and format final paper for publication',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-06-15',
        assigned_to: null
      }
    ];

    // Project 2 - Corporate Website
    const project2Tasks = [
      {
        project_id: createdProjects[1].id,
        title: 'Create wireframes and mockups',
        description: 'Design all pages and user flows in Figma',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[1].id,
        title: 'Develop homepage and main sections',
        description: 'Implement responsive layouts with React components',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-02-01',
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[1].id,
        title: 'Implement CMS integration',
        description: 'Connect Strapi CMS and create content types',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-02-15',
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[1].id,
        title: 'Testing and quality assurance',
        description: 'Cross-browser testing, accessibility audit, performance optimization',
        status: 'todo',
        priority: 'high',
        due_date: '2026-03-01',
        assigned_to: null
      }
    ];

    // Project 3 - EU Digital Skills
    const project3Tasks = [
      {
        project_id: createdProjects[2].id,
        title: 'Submit project proposal',
        description: 'Complete and submit Erasmus+ application',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[2].id,
        title: 'Partner recruitment and agreements',
        description: 'Sign MOUs with partner organizations in 5 countries',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-01-31',
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[2].id,
        title: 'Develop training curriculum',
        description: 'Create digital skills modules and learning materials',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-03-15',
        assigned_to: null
      }
    ];

    // Project 4 - Public Health
    const project4Tasks = [
      {
        project_id: createdProjects[3].id,
        title: 'Secure funding and approvals',
        description: 'Obtain budget allocation and regulatory approvals',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[3].id,
        title: 'Establish mobile clinic schedule',
        description: 'Plan routes and dates for 20 rural locations',
        status: 'done',
        priority: 'medium',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[3].id,
        title: 'Community outreach and registration',
        description: 'Social media campaign and registration system',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-02-01',
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[3].id,
        title: 'Campaign evaluation and reporting',
        description: 'Collect metrics and prepare final report',
        status: 'todo',
        priority: 'low',
        due_date: '2026-03-31',
        assigned_to: null
      }
    ];

    // Project 5 - Personal Portfolio
    const project5Tasks = [
      {
        project_id: createdProjects[4].id,
        title: 'Design and layout',
        description: 'Create modern, responsive portfolio design',
        status: 'done',
        priority: 'medium',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[4].id,
        title: 'Implement blog functionality',
        description: 'Add markdown blog with syntax highlighting',
        status: 'done',
        priority: 'medium',
        due_date: null,
        assigned_to: demoUserId
      },
      {
        project_id: createdProjects[4].id,
        title: 'Deploy to production',
        description: 'Set up CI/CD and deploy to Netlify',
        status: 'done',
        priority: 'high',
        due_date: null,
        assigned_to: demoUserId
      }
    ];

    allTasks.push(...project1Tasks, ...project2Tasks, ...project3Tasks, ...project4Tasks, ...project5Tasks);

    const { data: createdTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(allTasks)
      .select();

    if (tasksError) throw tasksError;
    console.log(`✅ Created ${createdTasks.length} tasks`);

    // Step 5: Create project updates
    console.log('📝 Creating project updates...');
    
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const allUpdates = [
      // Project 1 updates
      {
        project_id: createdProjects[0].id,
        update_type: 'milestone',
        description: 'Project kickoff meeting completed',
        created_by: demoUserId,
        created_at: twoMonthsAgo.toISOString()
      },
      {
        project_id: createdProjects[0].id,
        update_type: 'task_completed',
        description: "Task 'Literature review and background research' marked as complete",
        created_by: demoUserId,
        created_at: oneMonthAgo.toISOString()
      },
      {
        project_id: createdProjects[0].id,
        update_type: 'general',
        description: 'Monthly progress update: 65% complete',
        created_by: demoUserId,
        created_at: oneWeekAgo.toISOString()
      },
      // Project 2 updates
      {
        project_id: createdProjects[1].id,
        update_type: 'status_changed',
        description: 'Project status changed to Active',
        created_by: demoUserId,
        created_at: oneMonthAgo.toISOString()
      },
      {
        project_id: createdProjects[1].id,
        update_type: 'milestone',
        description: 'Design phase completed and approved',
        created_by: demoUserId,
        created_at: oneWeekAgo.toISOString()
      },
      {
        project_id: createdProjects[1].id,
        update_type: 'general',
        description: 'Development progressing on schedule',
        created_by: demoUserId,
        created_at: yesterday.toISOString()
      },
      // Project 3 updates
      {
        project_id: createdProjects[2].id,
        update_type: 'milestone',
        description: 'Project proposal approved by Erasmus+ committee',
        created_by: demoUserId,
        created_at: oneMonthAgo.toISOString()
      },
      {
        project_id: createdProjects[2].id,
        update_type: 'general',
        description: 'Partner recruitment in progress, 3 of 5 partners confirmed',
        created_by: demoUserId,
        created_at: oneWeekAgo.toISOString()
      },
      // Project 4 updates
      {
        project_id: createdProjects[3].id,
        update_type: 'milestone',
        description: 'First mobile clinic visits completed successfully',
        created_by: demoUserId,
        created_at: oneWeekAgo.toISOString()
      },
      {
        project_id: createdProjects[3].id,
        update_type: 'general',
        description: 'Over 500 community members registered so far',
        created_by: demoUserId,
        created_at: yesterday.toISOString()
      },
      // Project 5 updates
      {
        project_id: createdProjects[4].id,
        update_type: 'milestone',
        description: 'Portfolio website launched successfully',
        created_by: demoUserId,
        created_at: twoMonthsAgo.toISOString()
      },
      {
        project_id: createdProjects[4].id,
        update_type: 'status_changed',
        description: 'Project marked as completed',
        created_by: demoUserId,
        created_at: twoMonthsAgo.toISOString()
      }
    ];

    const { data: createdUpdates, error: updatesError } = await supabase
      .from('project_updates')
      .insert(allUpdates)
      .select();

    if (updatesError) throw updatesError;
    console.log(`✅ Created ${createdUpdates.length} updates`);

    // Summary
    const summary = {
      projects: createdProjects.length,
      tasks: createdTasks.length,
      updates: createdUpdates.length
    };

    console.log(`\n✅ Demo data generated successfully!`);
    console.log(`   📁 Projects: ${summary.projects}`);
    console.log(`   ✅ Tasks: ${summary.tasks}`);
    console.log(`   📝 Updates: ${summary.updates}\n`);

    return {
      success: true,
      message: 'Demo data generated successfully',
      stats: summary
    };

  } catch (error) {
    console.error('❌ Error generating demo data:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate demo data',
      error: error
    };
  }
}
