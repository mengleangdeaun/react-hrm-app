import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { AppText as Text } from '../AppText';
import { format } from '../../utils/dateTime';

interface DigitalClockProps {
    style?: any;
}

export const DigitalClock: React.FC<DigitalClockProps> = React.memo(({ style }) => {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 15000); // 15-second resolution ensures accurate minute transitions

        return () => clearInterval(timer);
    }, []);

    return (
        <Text style={style}>
            {format(currentTime, 'hh:mm a')}
        </Text>
    );
});
