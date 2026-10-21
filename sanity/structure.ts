import type { StructureResolver } from 'sanity/structure';

export const structure: StructureResolver = (S) =>
  S.list()
    .title('WEBRING Studio')
    .items([
      // 📋 Content
      S.listItem()
        .title('📋 Content')
        .child(
          S.list()
            .title('Content')
            .items([
              S.listItem()
                .title('Home Page')
                .child(
                  S.document()
                    .schemaType('homePage')
                    .documentId('homePage')
                    .title('Home Page')
                ),
              S.listItem()
                .title('Site Settings')
                .child(
                  S.document()
                    .schemaType('siteSettings')
                    .documentId('siteSettings')
                    .title('Site Settings')
                ),
              S.listItem()
                .title('Available Dates')
                .child(
                  S.document()
                    .schemaType('availableDates')
                    .documentId('availableDates')
                    .title('Available Dates')
                ),
            ])
        ),

      S.divider(),

      // 🖼️ Portfolio
      S.listItem()
        .title('🖼️ Portfolio')
        .schemaType('portfolio')
        .child(
          S.documentTypeList('portfolio')
            .title('Portfolio Items')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
        ),

      // 👥 Team
      S.listItem()
        .title('👥 Team')
        .schemaType('teamMember')
        .child(S.documentTypeList('teamMember').title('Team Members')),

      // 🛠️ Services
      S.listItem()
        .title('🛠️ Services')
        .schemaType('service')
        .child(S.documentTypeList('service').title('Services')),

      S.divider(),

      // ⭐ Testimonials
      S.listItem()
        .title('⭐ Testimonials')
        .schemaType('testimonial')
        .child(S.documentTypeList('testimonial').title('Testimonials')),

      // 💰 Pricing
      S.listItem()
        .title('💰 Pricing')
        .schemaType('pricing')
        .child(S.documentTypeList('pricing').title('Pricing Tiers')),

      S.divider(),

      // 📬 Bookings
      S.listItem()
        .title('📬 Bookings')
        .schemaType('booking')
        .child(
          S.documentTypeList('booking')
            .title('Booking Submissions')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }])
        ),
    ]);
