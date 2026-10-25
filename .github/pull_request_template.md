<!--
  Recorrido: historia → feature → develop → main
  Este PR debe apuntar al siguiente escalón, nunca saltarse uno:
    rama de historia → rama feature | rama feature → develop | develop → main
-->

## Recorrido

- [ ] Rama destino correcta (historia → feature, feature → develop o develop → main)
- [ ] La rama origen está al día con la rama destino

## Historia o tarea de Jira

<!-- Clave del elemento, por ejemplo MAR-43. También debe ir en el título del PR. -->
MAR-

## Qué cambia

<!-- Resumen breve del cambio. -->

## Criterios de aceptación cubiertos

<!-- Marca los escenarios de la historia que este PR cumple. -->
- [ ] Escenario 1
- [ ] Escenario 2
- [ ] Escenario 3

## Evidencia

- [ ] Pruebas automatizadas en verde (GitHub Actions)
- [ ] Quality Gate de SonarQube Cloud aprobado (enlace o captura)
- [ ] Consume el API según el contrato OpenAPI, si el cambio llama a un servicio REST
- [ ] Captura o descripción de la pantalla, si cambia la interfaz
- [ ] Matriz de trazabilidad actualizada (rama, commits, PR, prueba)

## Revisión

- [ ] Al menos una revisión de otro integrante del equipo
