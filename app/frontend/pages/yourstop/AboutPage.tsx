import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  Database,
  Zap,
  Shield,
  Heart,
  CheckCircle,
  ArrowRight,
  Utensils
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const [stats, setStats] = useState({
    restaurants: 0,
    bookings: 0,
    customers: 0,
    cities: 0
  });

  useEffect(() => {
    // Animate numbers on load
    const animateNumber = (target: number, setter: (value: number) => void) => {
      let current = 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, 50);
    };

    animateNumber(5896, (value) => setStats(prev => ({ ...prev, restaurants: value })));
    animateNumber(150000, (value) => setStats(prev => ({ ...prev, bookings: value })));
    animateNumber(75000, (value) => setStats(prev => ({ ...prev, customers: value })));
    animateNumber(25, (value) => setStats(prev => ({ ...prev, cities: value })));
  }, []);

  const features = [
    {
      icon: <Database className="h-8 w-8" />,
      title: "Multi-Source Data",
      description: "We aggregate restaurant data from Google Places, Yelp, OpenStreetMap, and Foursquare to provide the most comprehensive information."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "AI-Powered Features",
      description: "Our platform uses advanced AI for menu generation, smart search, availability prediction, and personalized recommendations."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Reliable & Secure",
      description: "Enterprise-grade security with 99.9% uptime guarantee. Your data and bookings are always safe with us."
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Customer First",
      description: "Every feature is designed with our users in mind. We prioritize user experience and satisfaction above all."
    }
  ];

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Founder",
      image: "/api/placeholder/150/150?text=SJ",
      description: "Former restaurant industry executive with 15+ years of experience."
    },
    {
      name: "Michael Chen",
      role: "CTO",
      image: "/api/placeholder/150/150?text=MC",
      description: "Tech leader specializing in AI and data aggregation systems."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      image: "/api/placeholder/150/150?text=ER",
      description: "UX expert focused on creating seamless dining experiences."
    },
    {
      name: "David Kim",
      role: "Head of Partnerships",
      image: "/api/placeholder/150/150?text=DK",
      description: "Building relationships with restaurants and service providers."
    }
  ];

  const milestones = [
    {
      year: "2023",
      title: "Company Founded",
      description: "Started with a vision to revolutionize restaurant discovery and booking."
    },
    {
      year: "2024",
      title: "Multi-Source Integration",
      description: "Successfully integrated data from 4 major restaurant data providers."
    },
    {
      year: "2024",
      title: "AI Enhancement Layer",
      description: "Launched AI-powered features for menu generation and smart recommendations."
    },
    {
      year: "2024",
      title: "Production Ready",
      description: "Platform now serves 5,896+ restaurants with enterprise-grade reliability."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-secondary/10 to-background py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-brand-secondary text-primary-foreground">
              About BookMyTable
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-bold text-brand-secondary mb-6">
              Revolutionizing Restaurant Discovery
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're building the world's most comprehensive restaurant booking platform, 
              powered by AI and multi-source data aggregation to help you discover and book 
              the perfect dining experience.
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-secondary mb-2">
                {stats.restaurants.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Restaurants</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-secondary mb-2">
                {stats.bookings.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Bookings Made</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-secondary mb-2">
                {stats.customers.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Happy Customers</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-secondary mb-2">
                {stats.cities}+
              </div>
              <p className="text-muted-foreground">Cities Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-brand-secondary mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                To make restaurant discovery and booking as simple and delightful as possible. 
                We believe that finding the perfect dining experience shouldn't be complicated 
                or time-consuming.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                By leveraging cutting-edge technology and comprehensive data sources, we're 
                creating a platform that understands your preferences and connects you with 
                restaurants that match your taste, budget, and occasion.
              </p>
              <div className="flex items-center gap-4">
                <CheckCircle className="h-6 w-6 text-brand-success" />
                <span className="text-foreground/80">Comprehensive restaurant database</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <CheckCircle className="h-6 w-6 text-brand-success" />
                <span className="text-foreground/80">AI-powered recommendations</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <CheckCircle className="h-6 w-6 text-brand-success" />
                <span className="text-foreground/80">Real-time availability and booking</span>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-brand-secondary to-brand-secondary/80 rounded-2xl p-8 text-primary-foreground">
                <Target className="h-12 w-12 mb-6" />
                <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                <p className="text-primary-foreground/80 leading-relaxed">
                  To become the global leader in restaurant discovery and booking, 
                  making every dining experience memorable and accessible to everyone, 
                  everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-brand-secondary mb-4">What Makes Us Different</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're not just another booking platform. We're building the future of restaurant discovery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-8 pb-6">
                  <div className="w-16 h-16 bg-brand-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-secondary">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-brand-secondary mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-brand-secondary mb-4">Meet Our Team</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Passionate individuals working together to transform the dining experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-8 pb-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-brand-secondary mb-1">{member.name}</h3>
                  <p className="text-brand-secondary font-medium mb-3">{member.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{member.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-gradient-to-r from-brand-secondary/10 to-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-brand-secondary mb-4">Our Journey</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From a simple idea to a comprehensive restaurant platform.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-brand-secondary/20"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <Card className="hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-6">
                        <div className="text-2xl font-bold text-brand-secondary mb-2">{milestone.year}</div>
                        <h3 className="text-xl font-bold text-foreground mb-3">{milestone.title}</h3>
                        <p className="text-muted-foreground">{milestone.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="w-4 h-4 bg-brand-secondary rounded-full border-4 border-background shadow-lg z-10"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-secondary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Discover Amazing Restaurants?</h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-3xl mx-auto">
            Join thousands of food lovers who trust BookMyTable to find and book their perfect dining experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-background text-brand-secondary hover:bg-background/90">
              <Link to="/yourstop/restaurants">
                <Utensils className="mr-2 h-5 w-5" />
                Explore Restaurants
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-background hover:text-brand-secondary">
              <Link to="/yourstop/contact">
                Contact Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

