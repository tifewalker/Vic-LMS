-- The school's decision (2026-11-25): there is one course, Entrepreneurship and Innovation, and
-- the eight training areas (in the landing page's order) are its course outline (topics). Each class can name the topic it covers.

alter table public.programmes
  add column if not exists outline text[] not null default '{}';

alter table public.classes
  add column if not exists topic text check (topic is null or char_length(topic) between 1 and 200);

update public.programmes
  set title = 'Entrepreneurship and Innovation',
      slug = 'entrepreneurship-and-innovation',
      sort_order = 0,
      is_active = true,
      outline = array[
        'Entrepreneurship and Business Development',
        'Information Technology and Digital Productivity',
        'Digital Marketing and Business Analytics',
        'Artificial Intelligence and Machine Learning',
        'Cybersecurity and Data Protection',
        'Drone Technology and Aerial Data Applications',
        'Data Processing, Analysis and Visualisation',
        'Emerging Technologies: Internet of Things and Blockchain'
      ]
  where slug = 'entrepreneurship-and-business-development';

-- The other seven areas are now topics, not courses. They are switched off, not deleted, so
-- nothing is lost; an admin can delete them later. Students are taken out of them.
update public.programmes
  set is_active = false
  where slug in (
    'information-technology-and-digital-productivity',
    'digital-marketing-and-business-analytics',
    'data-processing-analysis-and-visualisation',
    'artificial-intelligence-and-machine-learning',
    'cybersecurity-and-data-protection',
    'drone-technology-and-aerial-data-applications',
    'emerging-technologies-internet-of-things-and-blockchain'
  );

delete from public.programme_students ps
  using public.programmes p
  where p.id = ps.programme_id and not p.is_active;
