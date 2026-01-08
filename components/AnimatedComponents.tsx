import React, { ReactNode } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

interface AnimatedListProps {
    children: ReactNode[];
    className?: string;
    staggerDelay?: number;
}

interface AnimatedCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

// Page transition variants
const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
            ease: 'easeIn',
        },
    },
};

// Fade in variants
const fadeInVariants: Variants = {
    initial: { opacity: 0 },
    enter: {
        opacity: 1,
        transition: { duration: 0.3 },
    },
    exit: {
        opacity: 0,
        transition: { duration: 0.2 },
    },
};

// Scale up variants
const scaleUpVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    enter: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.2 },
    },
};

// List item variants
const listContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.25,
            ease: 'easeOut',
        },
    },
};

// Card pop in variants
const cardVariants: Variants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    enter: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
};

/**
 * Animated page wrapper for smooth page transitions
 */
export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => (
    <motion.div
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Fade in wrapper
 */
export const FadeIn: React.FC<AnimatedPageProps> = ({ children, className = '' }) => (
    <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Scale up wrapper
 */
export const ScaleUp: React.FC<AnimatedPageProps> = ({ children, className = '' }) => (
    <motion.div
        variants={scaleUpVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Animated list container with staggered children
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
    children,
    className = '',
    staggerDelay = 0.08
}) => (
    <motion.div
        variants={{
            ...listContainerVariants,
            show: {
                ...listContainerVariants.show,
                transition: { staggerChildren: staggerDelay }
            }
        }}
        initial="hidden"
        animate="show"
        className={className}
    >
        {React.Children.map(children, (child, index) => (
            <motion.div key={index} variants={listItemVariants}>
                {child}
            </motion.div>
        ))}
    </motion.div>
);

/**
 * Animated card with pop-in effect
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
    children,
    className = '',
    delay = 0
}) => (
    <motion.div
        variants={cardVariants}
        initial="initial"
        animate="enter"
        transition={{ delay }}
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Button with tap animation
 */
export const AnimatedButton: React.FC<{
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}> = ({ children, onClick, className = '', disabled }) => (
    <motion.button
        onClick={onClick}
        disabled={disabled}
        className={className}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.1 }}
    >
        {children}
    </motion.button>
);

/**
 * Modal backdrop with fade
 */
export const AnimatedBackdrop: React.FC<{
    children: ReactNode;
    onClick?: () => void;
    className?: string;
}> = ({ children, onClick, className = '' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Modal content with scale animation
 */
export const AnimatedModal: React.FC<AnimatedPageProps> = ({ children, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={className}
    >
        {children}
    </motion.div>
);

export { AnimatePresence, motion };
export default AnimatedPage;
