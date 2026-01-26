import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Prueba de Frontend', () => {
    it('debería renderizar un elemento básico', () => {
        render(React.createElement('div', null, 'Hola Mundo'));
        expect(screen.getByText('Hola Mundo')).toBeInTheDocument();
    });
});
