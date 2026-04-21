import React from 'react';
import { Box, Flex, Heading, Text, Image } from '@chakra-ui/react';

const TestimonialCard = ({ name, title, testimonial, image }) => (
  <Box
    bg="white"
    borderRadius="md"
    boxShadow="md"
    p={6}
    textAlign="center"
    maxWidth="300px"
  >
    <Image
      src={image || "/placeholder.svg"}
      alt={name}
      borderRadius="full"
      boxSize="100px"
      mx="auto"
      mb={4}
    />
    <Heading as="h3" fontSize="md" fontWeight="semibold" mb={2}>
      {name}
    </Heading>
    <Text fontSize="sm" color="gray.600" mb={4}>
      {title}
    </Text>
    <Text fontSize="sm" fontStyle="italic">
      "{testimonial}"
    </Text>
  </Box>
);

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Alice Johnson',
      title: 'Marketing Manager',
      testimonial:
        'This platform has revolutionized our hospitality operations. Highly recommended!',
      image: 'https://via.placeholder.com/100',
    },
    {
      name: 'Bob Williams',
      title: 'Business Owner',
      testimonial:
        'Incredible service and support. Our customers are happier than ever.',
      image: 'https://via.placeholder.com/100',
    },
    {
      name: 'Charlie Brown',
      title: 'Head Chef',
      testimonial:
        'The best tool we have implemented in years. Streamlined and efficient.',
      image: 'https://via.placeholder.com/100',
    },
  ];

  return (
    <Box bg="gray.50" py={12}>
      <Box maxW="7xl" mx="auto" px={{ base: 4, md: 8 }}>
        <Heading
          as="h2"
          fontSize="3xl"
          fontWeight="bold"
          textAlign="center"
          mb={4}
        >
          What Our Customers Say
        </Heading>
        <Text
          fontSize="lg"
          color="gray.700"
          textAlign="center"
          mb={8}
        >
          Read real stories from satisfied customers.
        </Text>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justifyContent="center"
          alignItems="center"
          gap={8}
          wrap="wrap"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </Flex>
      </Box>
    </Box>
  );
};

export default TestimonialsSection;